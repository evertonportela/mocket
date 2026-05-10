import { get, put } from "@vercel/blob";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createEmptyRegistry,
  type MockDefinition,
  type MockRegistry,
  validateMockDefinition,
} from "@/lib/mocks/types";

const REGISTRY_FILE = path.join(process.cwd(), "data", "mock-registry.json");

/** Pathname fixo no Blob store (mesmo objeto em todas as atualizações). */
const BLOB_PATHNAME = "mocket/mock-registry.json";

type CacheState = {
  loadedAtMs: number;
  registry: MockRegistry;
};

let cache: CacheState | null = null;
const CACHE_TTL_MS = 500;

function shouldUseBlob(): boolean {
  if (process.env.MOCK_REGISTRY_FORCE_FS === "true") return false;
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function resolveBlobAccess(): "public" | "private" {
  const v = process.env.MOCK_REGISTRY_BLOB_ACCESS?.toLowerCase();
  if (v === "public") return "public";
  return "private";
}

async function ensureDataDir() {
  const dir = path.dirname(REGISTRY_FILE);
  await fs.mkdir(dir, { recursive: true });
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

async function writeAtomicJson(filePath: string, value: unknown) {
  await ensureDataDir();
  const tmp = `${filePath}.${Date.now()}.tmp`;
  const data = JSON.stringify(value, null, 2) + "\n";
  await fs.writeFile(tmp, data, "utf8");
  await fs.rm(filePath, { force: true });
  await fs.rename(tmp, filePath);
}

async function readRegistryFromBlob(): Promise<MockRegistry | null> {
  const access = resolveBlobAccess();
  const result = await get(BLOB_PATHNAME, {
    access,
    ...(access === "private" ? { useCache: false as const } : {}),
  });
  if (!result || result.statusCode !== 200 || result.stream === null)
    return null;
  const raw = await new Response(result.stream).text();
  const parsed = JSON.parse(raw) as unknown;
  return normalizeRegistry(parsed);
}

async function writeRegistryToBlob(registry: MockRegistry): Promise<void> {
  const access = resolveBlobAccess();
  const data = JSON.stringify(registry, null, 2) + "\n";
  await put(BLOB_PATHNAME, data, {
    access,
    contentType: "application/json",
    allowOverwrite: true,
  });
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeRegistry(v: unknown): MockRegistry {
  if (typeof v !== "object" || v === null) return createEmptyRegistry();
  const rec = v as Partial<MockRegistry>;
  const mocks = Array.isArray(rec.mocks) ? rec.mocks : [];
  const normalized: MockDefinition[] = [];
  for (const item of mocks) {
    const r = validateMockDefinition(item);
    if (r.ok) normalized.push(r.value);
  }
  return {
    version: 1,
    mocks: normalized,
    updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : nowIso(),
  };
}

export async function loadRegistry(options?: {
  bypassCache?: boolean;
}): Promise<MockRegistry> {
  const bypassCache = options?.bypassCache ?? false;
  const now = Date.now();
  if (!bypassCache && cache && now - cache.loadedAtMs < CACHE_TTL_MS)
    return cache.registry;

  if (shouldUseBlob()) {
    const registry = (await readRegistryFromBlob()) ?? createEmptyRegistry();
    cache = { loadedAtMs: now, registry };
    return registry;
  }

  try {
    const parsed = await readJsonFile(REGISTRY_FILE);
    const registry = normalizeRegistry(parsed);
    cache = { loadedAtMs: now, registry };
    return registry;
  } catch (err: unknown) {
    const code =
      typeof err === "object" &&
      err &&
      "code" in err &&
      typeof (err as { code?: unknown }).code === "string"
        ? (err as { code: string }).code
        : undefined;
    if (code === "ENOENT") {
      const registry = createEmptyRegistry();
      await writeAtomicJson(REGISTRY_FILE, registry);
      cache = { loadedAtMs: now, registry };
      return registry;
    }
    throw err;
  }
}

async function saveRegistry(registry: MockRegistry): Promise<void> {
  const next: MockRegistry = { ...registry, version: 1, updatedAt: nowIso() };
  if (shouldUseBlob()) {
    await writeRegistryToBlob(next);
  } else {
    await writeAtomicJson(REGISTRY_FILE, next);
  }
  cache = { loadedAtMs: Date.now(), registry: next };
}

export async function listMocks(): Promise<MockDefinition[]> {
  const reg = await loadRegistry();
  return reg.mocks
    .slice()
    .sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path));
}

export async function getMock(id: string): Promise<MockDefinition | null> {
  const reg = await loadRegistry();
  return reg.mocks.find((m) => m.id === id) ?? null;
}

export async function upsertMock(
  mock: MockDefinition,
): Promise<MockDefinition> {
  const reg = await loadRegistry({ bypassCache: true });
  const idx = reg.mocks.findIndex((m) => m.id === mock.id);
  const nextMocks = reg.mocks.slice();
  if (idx >= 0) nextMocks[idx] = mock;
  else nextMocks.push(mock);
  await saveRegistry({ ...reg, mocks: nextMocks });
  return mock;
}

export async function deleteMock(id: string): Promise<boolean> {
  const reg = await loadRegistry({ bypassCache: true });
  const before = reg.mocks.length;
  const next = reg.mocks.filter((m) => m.id !== id);
  if (next.length === before) return false;
  await saveRegistry({ ...reg, mocks: next });
  return true;
}

import {
  createEmptyRegistry,
  type MockDefinition,
  type MockRegistry,
  validateMockDefinition,
} from "@/lib/mocks/types";

// Variável global para armazenar o registro em memória
let registryCache: MockRegistry = createEmptyRegistry();

// Função para carregar o registro da memória
async function loadRegistry(): Promise<MockRegistry> {
  return registryCache;
}

// Função para salvar o registro na memória
async function saveRegistry(newRegistry: MockRegistry): Promise<void> {
  registryCache = newRegistry;
}

// Funções principais
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
  const reg = await loadRegistry();
  const idx = reg.mocks.findIndex((m) => m.id === mock.id);
  const nextMocks = reg.mocks.slice();
  if (idx >= 0) nextMocks[idx] = mock;
  else nextMocks.push(mock);
  await saveRegistry({ ...reg, mocks: nextMocks });
  return mock;
}

export async function deleteMock(id: string): Promise<boolean> {
  const reg = await loadRegistry();
  const before = reg.mocks.length;
  const next = reg.mocks.filter((m) => m.id !== id);
  if (next.length === before) return false;
  await saveRegistry({ ...reg, mocks: next });
  return true;
}

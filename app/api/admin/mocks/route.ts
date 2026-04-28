import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { listMocks, upsertMock } from "@/lib/storage/mockRegistry";
import { normalizeMethod, validateMockDefinition } from "@/lib/mocks/types";

export async function GET() {
  const mocks = await listMocks();
  return Response.json({ mocks });
}

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as unknown;
  if (!payload || typeof payload !== "object") return Response.json({ error: "Invalid JSON body" }, { status: 400 });

  const id = randomUUID();
  const candidate: Record<string, unknown> = {
    id,
    enabled: true,
    priority: 0,
    method: "GET",
    path: "/",
    response: { status: 200, body: { ok: true } },
  };
  Object.assign(candidate, payload);

  // accept lowercased method etc
  if (typeof candidate.method === "string") {
    const m = normalizeMethod(candidate.method);
    if (m) candidate.method = m;
  }

  const validated = validateMockDefinition(candidate);
  if (!validated.ok) return Response.json({ error: validated.error }, { status: 400 });

  const saved = await upsertMock(validated.value);
  return Response.json({ mock: saved }, { status: 201 });
}


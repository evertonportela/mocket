import type { NextRequest } from "next/server";
import { deleteMock, getMock, upsertMock } from "@/lib/storage/mockRegistry";
import { normalizeMethod, validateMockDefinition } from "@/lib/mocks/types";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const mock = await getMock(id);
  if (!mock) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ mock });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const existing = await getMock(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const payload = (await req.json().catch(() => null)) as unknown;
  if (!payload || typeof payload !== "object")
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });

  const candidate: Record<string, unknown> = { ...existing, id };
  Object.assign(candidate, payload);
  if (typeof candidate.method === "string") {
    const m = normalizeMethod(candidate.method);
    if (m) candidate.method = m;
  }

  const validated = validateMockDefinition(candidate);
  if (!validated.ok)
    return Response.json({ error: validated.error }, { status: 400 });

  const saved = await upsertMock(validated.value);
  return Response.json({ mock: saved });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ok = await deleteMock(id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}

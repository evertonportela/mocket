import type { NextRequest } from "next/server";
import { normalizeMethod } from "@/lib/mocks/types";
import { listMocks } from "@/lib/storage/mockRegistry";
import { selectBestMock, type NormalizedRequest } from "@/lib/matcher/match";
import { addRequestLogEntry } from "@/lib/observability/requestLog";

async function readBody(req: NextRequest): Promise<{ raw: string; json?: unknown; form?: Record<string, string[]> }> {
  const contentType = req.headers.get("content-type") ?? "";
  const raw = await req.text();

  if (raw === "") return { raw: "" };

  if (contentType.includes("application/json")) {
    try {
      return { raw, json: JSON.parse(raw) as unknown };
    } catch {
      return { raw };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const form: Record<string, string[]> = {};
    for (const [k, v] of params.entries()) {
      form[k] ??= [];
      form[k].push(v);
    }
    return { raw, form };
  }

  return { raw };
}

function queryToRecord(sp: URLSearchParams): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of sp.entries()) {
    out[k] ??= [];
    out[k].push(v);
  }
  return out;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of headers.entries()) out[k] = v;
  return out;
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const method = normalizeMethod(req.method);
  if (!method) return Response.json({ error: "Method not supported" }, { status: 405 });

  const { path } = await ctx.params;
  const actualPath = "/" + (path ?? []).join("/");

  const body = await readBody(req);

  const normalized: NormalizedRequest = {
    method,
    path: actualPath,
    query: queryToRecord(req.nextUrl.searchParams),
    headers: headersToRecord(req.headers),
    bodyRaw: body.raw,
    bodyJson: body.json ?? body.form,
  };

  const mocks = await listMocks();
  const best = selectBestMock(mocks, normalized);

  if (!best) {
    addRequestLogEntry({
      at: new Date().toISOString(),
      method,
      path: actualPath,
      query: normalized.query,
      status: 404,
      bodyRawPreview: normalized.bodyRaw.slice(0, 500),
    });
    return Response.json({ error: "No mock matched" }, { status: 404 });
  }

  const { response } = best.mock;
  if (response.delayMs && response.delayMs > 0) {
    await new Promise((r) => setTimeout(r, response.delayMs));
  }

  const headers = new Headers(response.headers ?? undefined);

  if (response.body === undefined || response.body === null) {
    addRequestLogEntry({
      at: new Date().toISOString(),
      method,
      path: actualPath,
      query: normalized.query,
      status: response.status,
      matchedMockId: best.mock.id,
      bodyRawPreview: normalized.bodyRaw.slice(0, 500),
    });
    return new Response(null, { status: response.status, headers });
  }

  if (typeof response.body === "string") {
    if (!headers.has("content-type")) headers.set("content-type", "text/plain; charset=utf-8");
    addRequestLogEntry({
      at: new Date().toISOString(),
      method,
      path: actualPath,
      query: normalized.query,
      status: response.status,
      matchedMockId: best.mock.id,
      bodyRawPreview: normalized.bodyRaw.slice(0, 500),
    });
    return new Response(response.body, { status: response.status, headers });
  }

  if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
  addRequestLogEntry({
    at: new Date().toISOString(),
    method,
    path: actualPath,
    query: normalized.query,
    status: response.status,
    matchedMockId: best.mock.id,
    bodyRawPreview: normalized.bodyRaw.slice(0, 500),
  });
  return new Response(JSON.stringify(response.body), { status: response.status, headers });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx);
}
export async function HEAD(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx);
}
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx);
}


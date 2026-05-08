import { clearRequestLog, listRequestLogEntries } from "@/lib/observability/requestLog";

export async function GET() {
  return Response.json({ entries: listRequestLogEntries() });
}

export async function DELETE() {
  clearRequestLog();
  return Response.json({ ok: true });
}


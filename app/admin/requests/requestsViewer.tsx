"use client";

import { useEffect, useState } from "react";
import type { RequestLogEntry } from "@/lib/observability/requestLog";

export default function RequestsViewer() {
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function fetchEntries(): Promise<RequestLogEntry[]> {
    const res = await fetch("/api/admin/requests", { cache: "no-store" });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const maybeErr = typeof data === "object" && data && "error" in data ? (data as { error?: unknown }).error : null;
      throw new Error(typeof maybeErr === "string" ? maybeErr : `HTTP ${res.status}`);
    }
    const entriesRaw =
      typeof data === "object" && data && "entries" in data ? (data as { entries?: unknown }).entries : [];
    return Array.isArray(entriesRaw) ? (entriesRaw as RequestLogEntry[]) : [];
  }

  async function refresh() {
    setError(null);
    try {
      setEntries(await fetchEntries());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        setEntries(await fetchEntries());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao carregar");
      }
    })();
  }, []);

  async function clear() {
    if (!confirm("Limpar histórico?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/requests", { method: "DELETE" });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const maybeErr =
          typeof data === "object" && data && "error" in data ? (data as { error?: unknown }).error : null;
        throw new Error(typeof maybeErr === "string" ? maybeErr : `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-medium text-black dark:text-zinc-50">Histórico (memória)</div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Recarregar
          </button>
          <button
            disabled={busy}
            onClick={clear}
            className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
          >
            Limpar
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-600 dark:text-zinc-400">
            <tr className="border-b border-zinc-200 dark:border-white/10">
              <th className="py-2 pr-3 font-medium">At</th>
              <th className="py-2 pr-3 font-medium">Method</th>
              <th className="py-2 pr-3 font-medium">Path</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Mock</th>
              <th className="py-2 pr-3 font-medium">Body</th>
            </tr>
          </thead>
          <tbody className="text-zinc-900 dark:text-zinc-50">
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-zinc-100 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-xs">{e.at}</td>
                <td className="py-2 pr-3 font-mono">{e.method}</td>
                <td className="py-2 pr-3 font-mono">{e.path}</td>
                <td className="py-2 pr-3">{e.status}</td>
                <td className="py-2 pr-3 font-mono text-xs">{e.matchedMockId ?? "-"}</td>
                <td className="py-2 pr-3 font-mono text-xs">{e.bodyRawPreview ?? ""}</td>
              </tr>
            ))}
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-zinc-600 dark:text-zinc-400">
                  Nenhum request ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}


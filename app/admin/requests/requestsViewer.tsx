"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RequestLogEntry } from "@/lib/observability/requestLog";
import type { HttpMethod } from "@/lib/mocks/types";

/** Intervalo de polling para espelhar novos requests sem recarregar a página (ms). */
const POLL_MS = 1000;

function prettyBodyForDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  try {
    return JSON.stringify(JSON.parse(t), null, 2);
  } catch {
    return raw;
  }
}

function methodBadgeClass(method: HttpMethod): string {
  const base =
    "rounded px-2 py-0.5 text-xs font-semibold uppercase tabular-nums ring-1 ring-inset";
  switch (method) {
    case "GET":
      return `${base} bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300`;
    case "POST":
      return `${base} bg-sky-500/15 text-sky-800 ring-sky-500/30 dark:text-sky-200`;
    case "PUT":
      return `${base} bg-amber-500/15 text-amber-900 ring-amber-500/30 dark:text-amber-200`;
    case "PATCH":
      return `${base} bg-violet-500/15 text-violet-800 ring-violet-500/30 dark:text-violet-200`;
    case "DELETE":
      return `${base} bg-rose-500/15 text-rose-800 ring-rose-500/30 dark:text-rose-200`;
    default:
      return `${base} bg-zinc-500/15 text-zinc-800 ring-zinc-500/30 dark:text-zinc-200`;
  }
}

function statusBadgeClass(status: number): string {
  const base =
    "rounded px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset";
  if (status >= 200 && status < 300) {
    return `${base} bg-emerald-500/15 text-emerald-800 ring-emerald-500/35 dark:text-emerald-200`;
  }
  if (status >= 400) {
    return `${base} bg-rose-500/15 text-rose-800 ring-rose-500/35 dark:text-rose-200`;
  }
  return `${base} bg-zinc-500/15 text-zinc-800 ring-zinc-500/35 dark:text-zinc-200`;
}

function formatShortTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 5) return "agora";
  if (sec < 60) return `${sec}s atrás`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h atrás`;
  return new Date(iso).toLocaleString();
}

function sortedHeaderKeys(h: Record<string, string>): string[] {
  return Object.keys(h).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

function hasQueryParams(q: Record<string, string[]>): boolean {
  return Object.keys(q).length > 0;
}

/** Serializa o objeto query do log para o fragmento após `?` (ordem de chaves estável). */
function formatQueryString(q: Record<string, string[]>): string {
  const parts: string[] = [];
  for (const k of Object.keys(q).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )) {
    for (const v of q[k] ?? []) {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.join("&");
}

function QueryParamsTable({ query }: { query: Record<string, string[]> }) {
  const rows: { key: string; value: string }[] = [];
  for (const k of Object.keys(query).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )) {
    for (const v of query[k] ?? []) {
      rows.push({ key: k, value: v });
    }
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-500 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-400">
        Sem parâmetros na URL.
      </div>
    );
  }
  return (
    <div className="max-h-48 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50/90 text-xs dark:border-white/10 dark:bg-zinc-900/60">
      <table className="w-full text-left">
        <tbody className="divide-y divide-zinc-200 dark:divide-white/10">
          {rows.map((row, i) => (
            <tr key={`${row.key}-${i}`} className="align-top">
              <th className="whitespace-nowrap px-3 py-1.5 font-mono font-medium text-zinc-600 dark:text-zinc-400">
                {row.key}
              </th>
              <td className="break-all px-3 py-1.5 font-mono text-zinc-900 dark:text-zinc-100">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeadersBlock({ headers }: { headers: Record<string, string> }) {
  const keys = sortedHeaderKeys(headers);
  if (keys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-500 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-400">
        Sem headers.
      </div>
    );
  }
  return (
    <div className="max-h-48 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50/90 text-xs dark:border-white/10 dark:bg-zinc-900/60">
      <table className="w-full text-left">
        <tbody className="divide-y divide-zinc-200 dark:divide-white/10">
          {keys.map((k) => (
            <tr key={k} className="align-top">
              <th className="whitespace-nowrap px-3 py-1.5 font-mono font-medium text-zinc-600 dark:text-zinc-400">
                {k}
              </th>
              <td className="break-all px-3 py-1.5 font-mono text-zinc-900 dark:text-zinc-100">
                {headers[k]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BodyPanel({
  label,
  body,
  headers,
  truncated,
}: {
  label: string;
  body: string;
  headers: Record<string, string>;
  truncated?: boolean;
}) {
  const [headersOpen, setHeadersOpen] = useState(false);
  const display = useMemo(() => prettyBodyForDisplay(body), [body]);

  async function copyBody() {
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 dark:border-white/10">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHeadersOpen((v) => !v)}
            className="text-xs font-medium text-sky-700 underline decoration-sky-700/40 underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
          >
            {headersOpen ? "Ocultar headers" : "Ver headers"}
          </button>
          <button
            type="button"
            onClick={copyBody}
            className="rounded border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-zinc-800"
            title="Copiar corpo"
          >
            Copiar
          </button>
        </div>
      </div>

      {headersOpen ? (
        <div className="border-b border-zinc-100 px-3 py-2 dark:border-white/10">
          <div className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Headers
          </div>
          <HeadersBlock headers={headers} />
        </div>
      ) : null}

      <div className="min-h-[120px] flex-1 overflow-auto p-3">
        {truncated ? (
          <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            Corpo truncado no log (limite de armazenamento).
          </p>
        ) : null}
        {display === "" ? (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            (vazio)
          </span>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-900 dark:text-zinc-100">
            {display}
          </pre>
        )}
      </div>
    </div>
  );
}

function RequestEntryCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: RequestLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const summaryBody = entry.requestBody.trim()
    ? `${entry.requestBody.slice(0, 120)}${entry.requestBody.length > 120 ? "…" : ""}`
    : "";
  const queryRec = entry.query ?? {};
  const queryStr = hasQueryParams(queryRec) ? formatQueryString(queryRec) : "";
  const urlWithQuery = queryStr ? `${entry.path}?${queryStr}` : entry.path;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-2 border-b border-zinc-100 px-4 py-3 text-left transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-900/80"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={methodBadgeClass(entry.method)}>{entry.method}</span>
          <span className={statusBadgeClass(entry.status)}>{entry.status}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatShortTime(entry.at)}
          </span>
          <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
        <div className="font-mono text-sm break-all text-zinc-900 dark:text-zinc-50">
          {urlWithQuery}
        </div>
      </button>

      {!expanded && summaryBody ? (
        <div className="border-b border-zinc-50 px-4 py-2 font-mono text-[11px] text-zinc-500 dark:border-white/5 dark:text-zinc-500">
          {summaryBody}
        </div>
      ) : null}

      {expanded ? (
        <div className="flex flex-col gap-4 p-4">
          {hasQueryParams(queryRec) ? (
            <div>
              <div className="mb-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Parâmetros da URL (query string)
              </div>
              <p className="mb-2 font-mono text-xs break-all text-zinc-600 dark:text-zinc-400">
                <span className="text-zinc-500">?</span>
                {queryStr}
              </p>
              <QueryParamsTable query={queryRec} />
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <BodyPanel
              label="Request body"
              body={entry.requestBody}
              headers={entry.requestHeaders}
              truncated={entry.requestBodyTruncated}
            />
            <BodyPanel
              label="Response body"
              body={entry.responseBody}
              headers={entry.responseHeaders}
              truncated={entry.responseBodyTruncated}
            />
          </div>
        </div>
      ) : null}

      {expanded && entry.matchedMockId ? (
        <div className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-400">
          Mock:{" "}
          <span className="font-mono text-zinc-900 dark:text-zinc-200">
            {entry.matchedMockId}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function RequestsViewer() {
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  async function fetchEntries(): Promise<RequestLogEntry[]> {
    const res = await fetch("/api/admin/requests", { cache: "no-store" });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const maybeErr =
        typeof data === "object" && data && "error" in data
          ? (data as { error?: unknown }).error
          : null;
      throw new Error(
        typeof maybeErr === "string" ? maybeErr : `HTTP ${res.status}`,
      );
    }
    const entriesRaw =
      typeof data === "object" && data && "entries" in data
        ? (data as { entries?: unknown }).entries
        : [];
    return Array.isArray(entriesRaw) ? (entriesRaw as RequestLogEntry[]) : [];
  }

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setEntries(await fetchEntries());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      )
        return;
      try {
        const next = await fetchEntries();
        if (!cancelled) {
          setEntries(next);
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar");
        }
      }
    }

    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  function toggleExpanded(id: string) {
    setOpenIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function clear() {
    if (!confirm("Limpar histórico?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/requests", { method: "DELETE" });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const maybeErr =
          typeof data === "object" && data && "error" in data
            ? (data as { error?: unknown }).error
            : null;
        throw new Error(
          typeof maybeErr === "string" ? maybeErr : `HTTP ${res.status}`,
        );
      }
      setOpenIds(new Set());
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
        <div className="flex flex-wrap items-center gap-2 text-lg font-medium text-black dark:text-zinc-50">
          <span>Histórico (memória)</span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-normal text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200"
            title={`Atualização automática a cada ${POLL_MS / 1000}s`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Ao vivo
          </span>
        </div>
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

      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Clique numa entrada para ver corpo e headers do pedido e da resposta
        lado a lado.
      </p>

      <div className="mt-4 space-y-3">
        {entries.map((e) => (
          <RequestEntryCard
            key={e.id}
            entry={e}
            expanded={openIds.has(e.id)}
            onToggle={() => toggleExpanded(e.id)}
          />
        ))}
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-400">
            Nenhum request ainda.
          </div>
        ) : null}
      </div>
    </div>
  );
}

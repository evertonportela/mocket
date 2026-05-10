"use client";

import { useMemo, useState } from "react";
import type { MockDefinition } from "@/lib/mocks/types";

type Props = {
  initial?: MockDefinition;
  mode: "create" | "edit";
};

function prettyJson(v: unknown) {
  return JSON.stringify(v ?? null, null, 2);
}

function parseJson(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid JSON",
    };
  }
}

export default function MockEditor({ initial, mode }: Props) {
  const [enabled, setEnabled] = useState<boolean>(initial?.enabled ?? true);
  const [method, setMethod] = useState<string>(initial?.method ?? "GET");
  const [path, setPath] = useState<string>(initial?.path ?? "/hello");
  const [priority, setPriority] = useState<number>(initial?.priority ?? 0);
  const [status, setStatus] = useState<number>(initial?.response.status ?? 200);
  const [delayMs, setDelayMs] = useState<number>(
    initial?.response.delayMs ?? 0,
  );
  const [headersText, setHeadersText] = useState<string>(
    prettyJson(initial?.response.headers ?? {}),
  );
  const [bodyText, setBodyText] = useState<string>(
    prettyJson(initial?.response.body ?? { ok: true }),
  );
  const [rawContains, setRawContains] = useState<string>(
    initial?.match?.body?.find((b) => b.type === "rawContains")?.value ?? "",
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const id = initial?.id;
  const canSave = useMemo(() => path.startsWith("/"), [path]);

  const HOST_DOMAIN = process.env.HOST_DOMAIN ?? "localhost:3000";

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess("Copiado.");
      setTimeout(() => setSuccess(null), 1200);
    } catch {
      setError("Não foi possível copiar.");
      setTimeout(() => setError(null), 1500);
    }
  }

  async function onSave() {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const headersParsed = parseJson(headersText);
      if (
        !headersParsed.ok ||
        typeof headersParsed.value !== "object" ||
        headersParsed.value === null
      ) {
        throw new Error("response.headers deve ser um JSON objeto");
      }

      const bodyParsed = parseJson(bodyText);
      if (!bodyParsed.ok)
        throw new Error(`response.body inválido: ${bodyParsed.error}`);

      const payload: Record<string, unknown> = {
        enabled,
        method,
        path,
        priority,
        match: rawContains
          ? { body: [{ type: "rawContains", value: rawContains }] }
          : undefined,
        response: {
          status,
          delayMs: delayMs || undefined,
          headers: headersParsed.value,
          body: bodyParsed.value,
        },
      };

      const url =
        mode === "create" ? "/api/admin/mocks" : `/api/admin/mocks/${id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
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

      const saved =
        typeof data === "object" && data && "mock" in data
          ? ((data as { mock?: unknown }).mock as MockDefinition)
          : undefined;
      if (mode === "create" && saved?.id) {
        window.location.href = `/admin/mocks/${saved.id}`;
        return;
      }

      setSuccess("Salvo.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-medium text-black dark:text-zinc-50">
          {mode === "create" ? "Novo mock" : "Editar mock"}
        </div>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!canSave || busy}
          className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
        >
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {!canSave ? (
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200/90">
          O path precisa começar com <span className="font-mono">/</span> para o
          Salvar ficar habilitado (ex.:{" "}
          <span className="font-mono">/users</span>).
        </p>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {success}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Path
          </span>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
            placeholder="/users/:id"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Method
          </span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map(
              (m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Enabled
          </span>
          <select
            value={enabled ? "true" : "false"}
            onChange={(e) => setEnabled(e.target.value === "true")}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Priority
          </span>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
          />
        </label>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Status
          </span>
          <input
            type="number"
            value={status}
            onChange={(e) => setStatus(Number(e.target.value))}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Delay (ms)
          </span>
          <input
            type="number"
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Body rawContains
          </span>
          <input
            value={rawContains}
            onChange={(e) => setRawContains(e.target.value)}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
            placeholder={`ex: "admin":true`}
          />
        </label>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Response headers (JSON)
          </span>
          <textarea
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            className="min-h-40 rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Response body (JSON)
          </span>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            className="min-h-40 rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
          />
        </label>
      </div>

      {mode === "edit" && id ? (
        <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/40">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Como testar
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
              curl -i -X {method} {HOST_DOMAIN}/api/mock{path}
            </div>
            <button
              type="button"
              title="Copiar"
              aria-label="Copiar"
              onClick={() =>
                void copyToClipboard(
                  `curl -i -X ${method} ${HOST_DOMAIN}/api/mock${path}`,
                )
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";

function parseJsonOrNull(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export default function RequestBuilder() {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/hello");
  const [headersText, setHeadersText] = useState('{\n  "content-type": "application/json"\n}');
  const [bodyText, setBodyText] = useState('{\n  "hello": "world"\n}');

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: number; headers: Record<string, string>; body: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const hdrs = parseJsonOrNull(headersText);
      if (hdrs === null || typeof hdrs !== "object" || hdrs === null) throw new Error("Headers deve ser JSON objeto");

      const headers = new Headers();
      for (const [k, v] of Object.entries(hdrs as Record<string, unknown>)) {
        if (typeof v !== "string") throw new Error(`Header ${k} deve ser string`);
        headers.set(k, v);
      }

      const url = `/api/mock${path.startsWith("/") ? path : `/${path}`}`;
      const init: RequestInit = { method, headers };
      if (!["GET", "HEAD"].includes(method)) init.body = bodyText;

      const res = await fetch(url, init);
      const text = await res.text();
      const outHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => (outHeaders[k] = v));
      setResult({ status: res.status, headers: outHeaders, body: text });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-medium text-black dark:text-zinc-50">Request builder</div>
        <button
          onClick={run}
          disabled={busy}
          className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
        >
          {busy ? "Executando..." : "Executar"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Method</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Path (sem /api/mock)</span>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
            placeholder="/users/1"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Headers (JSON)</span>
          <textarea
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            className="min-h-40 rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Body (raw)</span>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            className="min-h-40 rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-700"
          />
        </label>
      </div>

      {result ? (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/40">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Resposta</div>
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">Status: {result.status}</div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-3 text-xs text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
            {result.body}
          </pre>
        </div>
      ) : null}
    </div>
  );
}


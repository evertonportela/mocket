"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MockDefinition } from "@/lib/mocks/types";

export default function MocksTable() {
  const [mocks, setMocks] = useState<MockDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function fetchMocks(): Promise<MockDefinition[]> {
    const res = await fetch("/api/admin/mocks", { cache: "no-store" });
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
    const mocksRaw =
      typeof data === "object" && data && "mocks" in data
        ? (data as { mocks?: unknown }).mocks
        : [];
    return Array.isArray(mocksRaw) ? (mocksRaw as MockDefinition[]) : [];
  }

  async function refresh() {
    setError(null);
    try {
      const next = await fetchMocks();
      setMocks(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }

  useEffect(() => {
    // Avoid synchronous setState inside effect body
    void (async () => {
      try {
        const next = await fetchMocks();
        setMocks(next);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao carregar");
      }
    })();
  }, []);

  async function onDelete(id: string) {
    if (!confirm("Remover este mock?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/mocks/${id}`, { method: "DELETE" });
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
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao remover");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-medium text-black dark:text-zinc-50">
          Mocks
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Recarregar
          </button>
          <Link
            href="/admin/mocks/new"
            className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-black"
          >
            Novo
          </Link>
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
              <th className="py-2 pr-3 font-medium">Enabled</th>
              <th className="py-2 pr-3 font-medium">Method</th>
              <th className="py-2 pr-3 font-medium">Path</th>
              <th className="py-2 pr-3 font-medium">Priority</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="text-zinc-900 dark:text-zinc-50">
            {mocks.map((m) => (
              <tr
                key={m.id}
                className="border-b border-zinc-100 dark:border-white/5"
              >
                <td className="py-2 pr-3">{m.enabled ? "true" : "false"}</td>
                <td className="py-2 pr-3 font-mono">{m.method}</td>
                <td className="py-2 pr-3 font-mono">{m.path}</td>
                <td className="py-2 pr-3">{m.priority}</td>
                <td className="py-2 pr-3">{m.response.status}</td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
                      href={`/admin/mocks/${m.id}`}
                    >
                      Editar
                    </Link>
                    <button
                      disabled={busyId === m.id}
                      onClick={() => onDelete(m.id)}
                      className="text-sm font-medium text-red-700 underline disabled:opacity-50 dark:text-red-300"
                    >
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {mocks.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-zinc-600 dark:text-zinc-400"
                >
                  Nenhum mock cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

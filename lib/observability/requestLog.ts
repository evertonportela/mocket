import type { HttpMethod } from "@/lib/mocks/types";

export type RequestLogEntry = {
  id: string;
  at: string;
  method: HttpMethod;
  path: string;
  query: Record<string, string[]>;
  status: number;
  matchedMockId?: string;
  bodyRawPreview?: string;
};

const MAX_ENTRIES = 200;

type Store = {
  entries: RequestLogEntry[];
};

declare global {
  var __mockserverRequestLog: Store | undefined;
}

function getStore(): Store {
  if (!globalThis.__mockserverRequestLog) globalThis.__mockserverRequestLog = { entries: [] };
  return globalThis.__mockserverRequestLog;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function addRequestLogEntry(entry: Omit<RequestLogEntry, "id">) {
  const store = getStore();
  store.entries.unshift({ ...entry, id: makeId() });
  if (store.entries.length > MAX_ENTRIES) store.entries.length = MAX_ENTRIES;
}

export function listRequestLogEntries(): RequestLogEntry[] {
  return getStore().entries.slice();
}

export function clearRequestLog() {
  getStore().entries = [];
}


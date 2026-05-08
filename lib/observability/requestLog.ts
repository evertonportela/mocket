import type { HttpMethod } from "@/lib/mocks/types";

/** Limite por campo de body no log (memória); trunca com flag se exceder. */
export const MAX_LOG_BODY_CHARS = 100_000;

export type RequestLogEntry = {
  id: string;
  at: string;
  method: HttpMethod;
  path: string;
  query: Record<string, string[]>;
  status: number;
  matchedMockId?: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  requestBodyTruncated?: boolean;
  responseHeaders: Record<string, string>;
  responseBody: string;
  responseBodyTruncated?: boolean;
};

export function truncateForLog(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_LOG_BODY_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_LOG_BODY_CHARS), truncated: true };
}

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
  const req = truncateForLog(entry.requestBody);
  const res = truncateForLog(entry.responseBody);
  const store = getStore();
  store.entries.unshift({
    ...entry,
    id: makeId(),
    requestBody: req.text,
    requestBodyTruncated: req.truncated,
    responseBody: res.text,
    responseBodyTruncated: res.truncated,
  });
  if (store.entries.length > MAX_ENTRIES) store.entries.length = MAX_ENTRIES;
}

export function listRequestLogEntries(): RequestLogEntry[] {
  return getStore().entries.slice();
}

export function clearRequestLog() {
  getStore().entries = [];
}


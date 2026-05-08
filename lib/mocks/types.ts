export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type MatchOperator = "equals" | "contains" | "regex";

export type KeyValueRule = {
  key: string;
  op: MatchOperator;
  value: string;
};

export type BodyRule =
  | { type: "rawContains"; value: string }
  | { type: "rawRegex"; value: string }
  | { type: "jsonEquals"; path: string; value: unknown };

export type MockMatch = {
  query?: KeyValueRule[];
  headers?: KeyValueRule[];
  body?: BodyRule[];
};

export type MockResponse = {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
  delayMs?: number;
};

export type MockDefinition = {
  id: string;
  enabled: boolean;
  method: HttpMethod;
  path: string;
  priority: number;
  match?: MockMatch;
  response: MockResponse;
};

export type MockRegistry = {
  version: 1;
  mocks: MockDefinition[];
  updatedAt: string;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

export function normalizeMethod(method: string): HttpMethod | null {
  const m = method.toUpperCase();
  switch (m) {
    case "GET":
    case "POST":
    case "PUT":
    case "PATCH":
    case "DELETE":
    case "HEAD":
    case "OPTIONS":
      return m;
    default:
      return null;
  }
}

function validateKeyValueRule(v: unknown, label: string): ValidationResult<KeyValueRule> {
  if (!isRecord(v)) return { ok: false, error: `${label} deve ser objeto` };
  if (!isString(v.key) || v.key.trim() === "")
    return { ok: false, error: `${label}.key deve ser string não vazia` };
  if (!isString(v.op)) return { ok: false, error: `${label}.op deve ser string` };
  if (!["equals", "contains", "regex"].includes(v.op))
    return { ok: false, error: `${label}.op inválido` };
  if (!isString(v.value)) return { ok: false, error: `${label}.value deve ser string` };
  return { ok: true, value: { key: v.key, op: v.op as MatchOperator, value: v.value } };
}

function validateBodyRule(v: unknown, label: string): ValidationResult<BodyRule> {
  if (!isRecord(v)) return { ok: false, error: `${label} deve ser objeto` };
  if (!isString(v.type)) return { ok: false, error: `${label}.type deve ser string` };

  if (v.type === "rawContains") {
    if (!isString(v.value)) return { ok: false, error: `${label}.value deve ser string` };
    return { ok: true, value: { type: "rawContains", value: v.value } };
  }

  if (v.type === "rawRegex") {
    if (!isString(v.value)) return { ok: false, error: `${label}.value deve ser string` };
    return { ok: true, value: { type: "rawRegex", value: v.value } };
  }

  if (v.type === "jsonEquals") {
    if (!isString(v.path) || v.path.trim() === "")
      return { ok: false, error: `${label}.path deve ser string não vazia` };
    return { ok: true, value: { type: "jsonEquals", path: v.path, value: v.value } };
  }

  return { ok: false, error: `${label}.type inválido` };
}

function validateMatch(v: unknown): ValidationResult<MockMatch | undefined> {
  if (v === undefined) return { ok: true, value: undefined };
  if (!isRecord(v)) return { ok: false, error: `match deve ser objeto` };

  const queryRules: KeyValueRule[] = [];
  if (v.query !== undefined) {
    if (!Array.isArray(v.query)) return { ok: false, error: `match.query deve ser array` };
    for (let i = 0; i < v.query.length; i++) {
      const r = validateKeyValueRule(v.query[i], `match.query[${i}]`);
      if (!r.ok) return r;
      queryRules.push(r.value);
    }
  }

  const headerRules: KeyValueRule[] = [];
  if (v.headers !== undefined) {
    if (!Array.isArray(v.headers)) return { ok: false, error: `match.headers deve ser array` };
    for (let i = 0; i < v.headers.length; i++) {
      const r = validateKeyValueRule(v.headers[i], `match.headers[${i}]`);
      if (!r.ok) return r;
      headerRules.push(r.value);
    }
  }

  const bodyRules: BodyRule[] = [];
  if (v.body !== undefined) {
    if (!Array.isArray(v.body)) return { ok: false, error: `match.body deve ser array` };
    for (let i = 0; i < v.body.length; i++) {
      const r = validateBodyRule(v.body[i], `match.body[${i}]`);
      if (!r.ok) return r;
      bodyRules.push(r.value);
    }
  }

  const result: MockMatch = {};
  if (queryRules.length) result.query = queryRules;
  if (headerRules.length) result.headers = headerRules;
  if (bodyRules.length) result.body = bodyRules;
  return { ok: true, value: Object.keys(result).length ? result : undefined };
}

function validateResponse(v: unknown): ValidationResult<MockResponse> {
  if (!isRecord(v)) return { ok: false, error: `response deve ser objeto` };
  if (!isNumber(v.status) || v.status < 100 || v.status > 599)
    return { ok: false, error: `response.status inválido` };

  let headers: Record<string, string> | undefined;
  if (v.headers !== undefined) {
    if (!isRecord(v.headers)) return { ok: false, error: `response.headers deve ser objeto` };
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v.headers)) {
      if (!isString(val)) return { ok: false, error: `response.headers.${k} deve ser string` };
      out[k] = val;
    }
    headers = out;
  }

  let delayMs: number | undefined;
  if (v.delayMs !== undefined) {
    if (!isNumber(v.delayMs) || v.delayMs < 0) return { ok: false, error: `response.delayMs inválido` };
    delayMs = v.delayMs;
  }

  return {
    ok: true,
    value: {
      status: v.status,
      headers,
      body: v.body,
      delayMs,
    },
  };
}

export function validateMockDefinition(v: unknown): ValidationResult<MockDefinition> {
  if (!isRecord(v)) return { ok: false, error: `mock deve ser objeto` };

  if (!isString(v.id) || v.id.trim() === "") return { ok: false, error: `id deve ser string não vazia` };
  if (!isBoolean(v.enabled)) return { ok: false, error: `enabled deve ser boolean` };

  if (!isString(v.method)) return { ok: false, error: `method deve ser string` };
  const method = normalizeMethod(v.method);
  if (!method) return { ok: false, error: `method inválido` };

  if (!isString(v.path) || !v.path.startsWith("/"))
    return { ok: false, error: `path deve ser string iniciando com '/'` };

  if (!isNumber(v.priority)) return { ok: false, error: `priority deve ser number` };

  const match = validateMatch(v.match);
  if (!match.ok) return match;

  const response = validateResponse(v.response);
  if (!response.ok) return response;

  return {
    ok: true,
    value: {
      id: v.id,
      enabled: v.enabled,
      method,
      path: v.path,
      priority: v.priority,
      match: match.value,
      response: response.value,
    },
  };
}

export function createEmptyRegistry(now = new Date()): MockRegistry {
  return { version: 1, mocks: [], updatedAt: now.toISOString() };
}


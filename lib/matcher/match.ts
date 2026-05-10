import type {
  BodyRule,
  HttpMethod,
  KeyValueRule,
  MockDefinition,
} from "@/lib/mocks/types";

export type NormalizedRequest = {
  method: HttpMethod;
  path: string;
  query: Record<string, string[]>;
  headers: Record<string, string>;
  bodyRaw: string;
  bodyJson?: unknown;
};

export type MatchResult = {
  mock: MockDefinition;
  params: Record<string, string>;
  score: number;
};

function splitPath(p: string): string[] {
  const trimmed = p.startsWith("/") ? p.slice(1) : p;
  if (trimmed === "") return [];
  return trimmed.split("/").filter(Boolean);
}

function compilePattern(patternPath: string) {
  const segments = splitPath(patternPath);
  const hasWildcard = segments.includes("*");
  const paramNames = segments
    .filter((s) => s.startsWith(":") && s.length > 1)
    .map((s) => s.slice(1));

  return { segments, hasWildcard, paramNames };
}

function matchPath(
  patternPath: string,
  actualPath: string,
): { ok: boolean; params: Record<string, string>; score: number } {
  const pat = compilePattern(patternPath);
  const a = splitPath(actualPath);

  // Wildcard '*' matches remaining segments, but only if present in pattern.
  // Supported forms:
  // - /foo/* matches /foo/anything/here
  // - /* matches everything
  const params: Record<string, string> = {};

  let score = 0;
  const maxI = Math.max(pat.segments.length, a.length);
  for (let i = 0; i < maxI; i++) {
    const ps = pat.segments[i];
    const as = a[i];

    if (ps === "*") {
      // wildcard consumes the rest
      score += 1;
      return { ok: true, params, score };
    }

    if (ps === undefined) return { ok: false, params: {}, score: 0 };
    if (as === undefined) return { ok: false, params: {}, score: 0 };

    if (ps.startsWith(":") && ps.length > 1) {
      params[ps.slice(1)] = decodeURIComponent(as);
      score += 2;
      continue;
    }

    if (ps === as) {
      score += 3;
      continue;
    }

    return { ok: false, params: {}, score: 0 };
  }

  // exact length match and no wildcard
  if (pat.hasWildcard) {
    // wildcard would have returned early above; if pattern contains '*' not reached, it means mismatch
    return { ok: false, params: {}, score: 0 };
  }

  // prefer exact match a bit
  score += 5;
  return { ok: true, params, score };
}

function normalizeHeaderKey(k: string) {
  return k.toLowerCase();
}

function testKeyValueRules(
  rules: KeyValueRule[] | undefined,
  haystack: Record<string, string | string[]>,
) {
  if (!rules?.length) return true;

  for (const rule of rules) {
    const key = normalizeHeaderKey(rule.key);
    const v = haystack[key];
    const values = Array.isArray(v) ? v : v !== undefined ? [v] : [];
    const joined = values.join(",");

    if (rule.op === "equals") {
      if (!values.some((x) => x === rule.value)) return false;
      continue;
    }
    if (rule.op === "contains") {
      if (!joined.includes(rule.value)) return false;
      continue;
    }
    if (rule.op === "regex") {
      const re = new RegExp(rule.value);
      if (!re.test(joined)) return false;
      continue;
    }
  }

  return true;
}

function getByPath(obj: unknown, pathExpr: string): unknown {
  // Simple dot-path: a.b[0].c  (supports [index])
  if (obj === null || obj === undefined) return undefined;
  const tokens: (string | number)[] = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pathExpr))) {
    if (m[1]) tokens.push(m[1]);
    else if (m[2]) tokens.push(Number(m[2]));
  }

  let cur: unknown = obj;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof t === "number") {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[t];
      continue;
    }
    if (typeof cur !== "object") return undefined;
    const rec = cur as Record<string, unknown>;
    cur = rec[t];
  }
  return cur;
}

function testBodyRules(rules: BodyRule[] | undefined, req: NormalizedRequest) {
  if (!rules?.length) return true;

  for (const rule of rules) {
    if (rule.type === "rawContains") {
      if (!req.bodyRaw.includes(rule.value)) return false;
      continue;
    }
    if (rule.type === "rawRegex") {
      const re = new RegExp(rule.value);
      if (!re.test(req.bodyRaw)) return false;
      continue;
    }
    if (rule.type === "jsonEquals") {
      const v = getByPath(req.bodyJson, rule.path);
      if (JSON.stringify(v) !== JSON.stringify(rule.value)) return false;
      continue;
    }
  }

  return true;
}

export function selectBestMock(
  mocks: MockDefinition[],
  req: NormalizedRequest,
): MatchResult | null {
  let best: MatchResult | null = null;

  const queryHaystack: Record<string, string[]> = req.query;
  const headerHaystack: Record<string, string> = req.headers;
  const headerHaystackLower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headerHaystack))
    headerHaystackLower[normalizeHeaderKey(k)] = v;

  for (const mock of mocks) {
    if (!mock.enabled) continue;
    if (mock.method !== req.method) continue;

    const mp = matchPath(mock.path, req.path);
    if (!mp.ok) continue;

    const match = mock.match;
    if (!testKeyValueRules(match?.query, queryHaystack)) continue;
    if (!testKeyValueRules(match?.headers, headerHaystackLower)) continue;
    if (!testBodyRules(match?.body, req)) continue;

    const score = mp.score + mock.priority * 1000;
    if (!best || score > best.score) {
      best = { mock, params: mp.params, score };
    }
  }

  return best;
}

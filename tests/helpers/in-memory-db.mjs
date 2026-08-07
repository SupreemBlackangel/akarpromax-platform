// In-memory D1-compatible adapter for deterministic services tests.
//
// Implements the SQL shapes used by lib/services marketplace functions
// (marketplace.ts, audit.ts, db.ts): INSERT/UPDATE/DELETE, SELECT with
// equality / IN / NOT IN / LIKE conditions, ORDER BY, LIMIT, COUNT(*),
// and the union sub-query used by deleteServiceCategory's in-use guard.
// It intentionally rejects anything else so tests fail loudly instead of
// silently producing wrong results.

function unquote(token) {
  const t = token.trim();
  if (t.length >= 2 && t[0] === "'" && t.at(-1) === "'") return t.slice(1, -1);
  if (t.length >= 2 && t[0] === '"' && t.at(-1) === '"') return t.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

function valueOf(token, params) {
  const t = token.trim();
  const m = /^\?(\d+)$/.exec(t);
  if (m) return params[Number(m[1]) - 1];
  if (t === "?") return params[0];
  return unquote(t);
}

function stripAlias(token) {
  const t = token.trim();
  const m = /^([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)$/.exec(t);
  return m ? m[2] : t;
}

function normalizeValue(row, col) {
  const v = row[col];
  if (typeof v === "number") return String(v);
  return v;
}

function compare(row, col, expected) {
  const a = normalizeValue(row, col);
  const b = expected == null ? "" : String(expected);
  if (a == null) return false;
  const an = Number(a);
  const bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn) && /^-?\d+(\.\d+)?$/.test(b) && /^-?\d+(\.\d+)?$/.test(a)) {
    return an === bn;
  }
  return String(a) === b;
}

function likeToRegExp(pattern) {
  let re = "";
  for (const ch of String(pattern)) {
    if (ch === "%") re += ".*";
    else if (ch === "_") re += ".";
    else re += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`, "i");
}

function splitLogical(expr, sepToken) {
  const parts = [];
  let depth = 0;
  let cur = "";
  let i = 0;
  const re = new RegExp(`\\b${sepToken}\\b`, "gi");
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0) {
      re.lastIndex = i;
      const m = re.exec(expr);
      if (m && m.index === i) {
        parts.push(cur.trim());
        cur = "";
        i = m.index + m[0].length;
        continue;
      }
    }
    cur += ch;
    i++;
  }
  parts.push(cur.trim());
  return parts.filter((p) => p.length > 0);
}

function evalClause(clause, row, params) {
  let c = clause.trim();
  while (c.startsWith("(") && c.endsWith(")") && c[0] === "(" && c.at(-1) === ")") {
    let depth = 0;
    let wrapped = true;
    for (let i = 0; i < c.length; i++) {
      if (c[i] === "(") depth++;
      else if (c[i] === ")") {
        depth--;
        if (depth === 0 && i !== c.length - 1) {
          wrapped = false;
          break;
        }
      }
    }
    if (!wrapped) break;
    c = c.slice(1, -1).trim();
  }

  if (/\bOR\b/i.test(c)) {
    return splitLogical(c, "OR").some((part) => evalClause(part, row, params));
  }

  const notIn = /^([a-z_][a-z0-9_.]*) NOT IN \((.*)\)$/i.exec(c);
  if (notIn) {
    const col = stripAlias(notIn[1]);
    const values = splitList(notIn[2]).map((item) => valueOf(item, params));
    return !values.some((v) => compare(row, col, v));
  }

  const inMatch = /^([a-z_][a-z0-9_.]*) IN \((.*)\)$/i.exec(c);
  if (inMatch) {
    const col = stripAlias(inMatch[1]);
    const values = splitList(inMatch[2]).map((item) => valueOf(item, params));
    return values.some((v) => compare(row, col, v));
  }

  const like = /^([a-z_][a-z0-9_.]*) LIKE (.+)$/i.exec(c);
  if (like) {
    const col = stripAlias(like[1]);
    const pattern = valueOf(like[2], params);
    const v = normalizeValue(row, col);
    return v != null && likeToRegExp(pattern).test(String(v));
  }

  const eq = /^([a-z_][a-z0-9_.]*) = (.+)$/i.exec(c);
  if (eq) {
    const col = stripAlias(eq[1]);
    return compare(row, col, valueOf(eq[2], params));
  }

  const isNull = /^([a-z_][a-z0-9_.]*) IS NULL$/i.exec(c);
  if (isNull) {
    const col = stripAlias(isNull[1]);
    return row[col] == null;
  }

  const isNotNull = /^([a-z_][a-z0-9_.]*) IS NOT NULL$/i.exec(c);
  if (isNotNull) {
    const col = stripAlias(isNotNull[1]);
    return row[col] != null;
  }

  const cmp = /^([a-z_][a-z0-9_.]*) (>=|<=|>|<) (.+)$/i.exec(c);
  if (cmp) {
    const col = stripAlias(cmp[1]);
    const v = row[col];
    if (v == null) return false;
    const aNum = Number(v);
    const bNum = Number(valueOf(cmp[3], params));
    const isNumeric = /^-?\d+(\.\d+)?$/.test(String(v)) && /^-?\d+(\.\d+)?$/.test(String(valueOf(cmp[3], params)));
    const a = isNumeric ? aNum : String(v);
    const b = isNumeric ? bNum : String(valueOf(cmp[3], params));
    switch (cmp[2]) {
      case ">":
        return a > b;
      case "<":
        return a < b;
      case ">=":
        return a >= b;
      case "<=":
        return a <= b;
    }
  }

  throw new Error(`Unsupported WHERE clause: ${c}`);
}

function splitList(inner) {
  const out = [];
  let cur = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "'") {
      const end = inner.indexOf("'", i + 1);
      cur += inner.slice(i, end + 1);
      i = end;
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out.filter((p) => p.length > 0);
}

function matchesRow(row, where, params) {
  if (!where) return true;
  return splitLogical(where, "AND").every((clause) => evalClause(clause, row, params));
}

function extractWhereAndTail(sql) {
  const orderByMatch = / order by (.+?)(?= limit|$)/i.exec(sql);
  const limitMatch = / limit (\d+|\?\d+)/i.exec(sql);
  const orderBy = orderByMatch?.[1] ?? null;
  const limit = limitMatch?.[1] ?? null;
  const whereMatch = / where (.+?)(?= order by| limit|$)/i.exec(sql);
  const where = whereMatch?.[1]?.trim() || null;
  return { where, orderBy, limit };
}

export class InMemoryDatabase {
  constructor() {
    this.tables = new Map();
  }

  table(name) {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name);
  }

  seed(name, rows) {
    for (const r of rows) this.table(name).push({ ...r });
  }

  dump(name) {
    return this.table(name).map((r) => ({ ...r }));
  }

  clear(name) {
    this.tables.delete(name);
  }

  prepare(sql) {
    return new Statement(this, sql.trim().replace(/\s+/g, " "));
  }
}

class Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...args) {
    this.params = args;
    return this;
  }

  async run() {
    if (/^insert/i.test(this.sql)) this.#insert();
    else if (/^update/i.test(this.sql)) this.#update();
    else if (/^delete/i.test(this.sql)) this.#delete();
    else throw new Error(`Unsupported write SQL: ${this.sql}`);
    return { meta: { changes: 0 } };
  }

  async first() {
    return this.#select()[0] ?? null;
  }

  async all() {
    return { results: this.#select() };
  }

  #insert() {
    const base = this.sql.match(/^insert (?:or ignore )?into ([a-z_][a-z0-9_]*) \(([^)]+)\) values \(([^)]+)\)/i);
    const onConflict = this.sql.match(/ on conflict\s*\(([^)]+)\) do update set (.+)$/i);
    if (!base) throw new Error(`Unsupported INSERT SQL: ${this.sql}`);
    const table = base[1];
    const columns = splitList(base[2]).map((c) => c.trim().replace(/^"|"$/g, ""));
    const values = splitList(base[3]).map((v) => valueOf(v, this.params));
    const row = {};
    columns.forEach((col, i) => {
      row[col] = values[i] ?? null;
    });

    if (onConflict) {
      const keyCols = splitList(onConflict[1]).map((c) => c.trim().replace(/^"|"$/g, ""));
      const rows = this.db.table(table);
      const existing = rows.find((r) => keyCols.every((col) => compare(r, col, row[col])));
      if (existing) {
        const assignments = splitList(onConflict[2]).map((a) => a.trim());
        for (const assignment of assignments) {
          const am = /^([a-z_][a-z0-9_]*) = (.+)$/i.exec(assignment);
          if (!am) throw new Error(`Unsupported ON CONFLICT SET clause: ${assignment}`);
          existing[am[1]] = valueOf(am[2], this.params);
        }
        return;
      }
    }

    this.db.table(table).push(row);
  }

  #update() {
    const setMatch = /^update ([a-z_][a-z0-9_]*) set (.+?)(?: where |$)/i.exec(this.sql);
    if (!setMatch) throw new Error(`Unsupported UPDATE SQL: ${this.sql}`);
    const table = setMatch[1];
    const { where } = extractWhereAndTail(this.sql);
    const assignments = splitList(setMatch[2]).map((a) => a.trim());
    const rows = this.db.table(table);
    let changed = 0;
    for (const row of rows) {
      if (where && !matchesRow(row, where, this.params)) continue;
      for (const assignment of assignments) {
        const am = /^([a-z_][a-z0-9_]*) = (.+)$/i.exec(assignment);
        if (!am) throw new Error(`Unsupported SET clause: ${assignment}`);
        row[am[1]] = valueOf(am[2], this.params);
      }
      changed++;
    }
    return changed;
  }

  #delete() {
    const m = /^delete from ([a-z_][a-z0-9_]*) where (.*)$/i.exec(this.sql);
    if (!m) throw new Error(`Unsupported DELETE SQL: ${this.sql}`);
    const table = m[1];
    const rows = this.db.table(table);
    for (let i = rows.length - 1; i >= 0; i--) {
      if (matchesRow(rows[i], m[2], this.params)) rows.splice(i, 1);
    }
  }

  #select() {
    if (/^select count\(\*\) as ([a-z_]+) from /i.test(this.sql)) {
      const m = /^select count\(\*\) as ([a-z_]+) from ([a-z_][a-z0-9_]*)(.*)$/i.exec(this.sql);
      const table = m[2];
      const { where } = extractWhereAndTail(m[3] || "");
      const count = this.db.table(table).filter((row) => matchesRow(row, where, this.params)).length;
      return [{ [m[1]]: count }];
    }

    if (/^select id from \(/i.test(this.sql)) {
      return this.#selectUnionInUse();
    }

    const m = /^select (distinct\s+)?(.+?) from ([a-z_][a-z0-9_]*)(.*)$/i.exec(this.sql);
    if (!m) throw new Error(`Unsupported SELECT SQL: ${this.sql}`);
    const table = m[3];
    const colsRaw = m[2].trim();
    const { where, orderBy, limit } = extractWhereAndTail(m[4] || "");

    let rows = this.db.table(table).filter((row) => matchesRow(row, where, this.params));

    if (orderBy) {
      const keys = splitList(orderBy).map((k) => {
        const km = /^([a-z_][a-z0-9_.]*) (asc|desc)$/i.exec(k.trim()) ?? /^([a-z_][a-z0-9_.]*) (asc|desc)$/i.exec(`${k.trim()} ASC`);
        const [kk, dir] = km ? [km[1], km[2]] : [k.trim(), "asc"];
        return { col: stripAlias(kk), desc: /desc/i.test(dir) };
      });
      rows = [...rows].sort((a, b) => {
        for (const k of keys) {
          const av = normalizeValue(a, k.col);
          const bv = normalizeValue(b, k.col);
          if (av == null && bv == null) continue;
          if (av == null) return k.desc ? 1 : -1;
          if (bv == null) return k.desc ? -1 : 1;
          let cmp = 0;
          const an = Number(av);
          const bn = Number(bv);
          if (Number.isFinite(an) && Number.isFinite(bn) && !isNaN(av) && !isNaN(bv)) cmp = an - bn;
          else cmp = String(av).localeCompare(String(bv));
          if (cmp !== 0) return k.desc ? -cmp : cmp;
        }
        return 0;
      });
    }

    if (limit) {
      const n = Number(valueOf(limit, this.params));
      rows = rows.slice(0, n);
    }

    const isStar = colsRaw.replace(/^distinct\s+/i, "").trim() === "*";
    return rows.map((row) => {
      if (isStar) return { ...row };
      const projected = {};
      for (const c of splitList(colsRaw.replace(/^distinct\s+/i, "")).map((c) => c.trim())) {
        const col = stripAlias(c);
        if (Object.prototype.hasOwnProperty.call(row, col)) projected[col] = row[col];
      }
      return projected;
    });
  }

  // SELECT id FROM (SELECT id, category_id FROM service_listings
  //                 UNION ALL ... service_requests ... service_provider_categories)
  // WHERE category_id = ?N LIMIT 1
  #selectUnionInUse() {
    const where = /where ([a-z_]+) = (\?\d+)/i.exec(this.sql);
    if (!where) throw new Error(`Unsupported union sub-query: ${this.sql}`);
    const col = where[1];
    const target = valueOf(where[2], this.params);
    for (const table of ["service_listings", "service_requests", "service_provider_categories"]) {
      const found = this.db.table(table).find((row) => compare(row, col, target));
      if (found) return [{ id: found.id }];
    }
    return [];
  }
}

export function createInMemoryDb() {
  return new InMemoryDatabase();
}

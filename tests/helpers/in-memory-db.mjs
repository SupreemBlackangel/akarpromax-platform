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
  if (/^null$/i.test(t)) return null;
  const m = /^\?(\d+)$/.exec(t);
  if (m) return params[Number(m[1]) - 1];
  if (t === "?") return params[0];
  return unquote(t);
}

function stripAlias(token) {
  // Accepts `col`, `alias.col` and the quoted form `"col"` that reserved words
  // such as "order" require.
  const t = token.trim().replace(/^"(.*)"$/, "$1");
  const m = /^([a-z_][a-z0-9_]*)\.("?[a-z_][a-z0-9_]*"?)$/.exec(t);
  return m ? m[2].replace(/^"(.*)"$/, "$1") : t;
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

  const dateCmp = /^date\(([a-z_][a-z0-9_.]+)\) (<=|>=|<|>) date\('now'\)$/i.exec(c);
  if (dateCmp) {
    const col = stripAlias(dateCmp[1]);
    const v = row[col];
    if (v == null) return false;
    const today = new Date().toISOString().slice(0, 10);
    const val = String(v).slice(0, 10);
    const cmp = val.localeCompare(today);
    switch (dateCmp[2]) {
      case "<": return cmp < 0;
      case ">": return cmp > 0;
      case "<=": return cmp <= 0;
      case ">=": return cmp >= 0;
    }
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

  const eq = /^("?[a-z_][a-z0-9_.]*"?) = (.+)$/i.exec(c);
  if (eq) {
    const col = stripAlias(eq[1]);
    return compare(row, col, valueOf(eq[2], params));
  }

  const ne = /^([a-z_][a-z0-9_.]*) != (.+)$/i.exec(c);
  if (ne) {
    const col = stripAlias(ne[1]);
    return !compare(row, col, valueOf(ne[2], params));
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
  const offsetMatch = / offset (\d+|\?\d+)/i.exec(sql);
  const orderBy = orderByMatch?.[1] ?? null;
  const limit = limitMatch?.[1] ?? null;
  const offset = offsetMatch?.[1] ?? null;
  const whereMatch = / where (.+?)(?= returning| order by| limit|$)/i.exec(sql);
  const where = whereMatch?.[1]?.trim() || null;
  return { where, orderBy, limit, offset };
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
    let changes = 0;
    if (/^insert/i.test(this.sql)) {
      this.#insert();
      changes = 1;
    } else if (/^update/i.test(this.sql)) changes = this.#update();
    else if (/^delete/i.test(this.sql)) changes = this.#delete();
    else throw new Error(`Unsupported write SQL: ${this.sql}`);
    return { meta: { changes } };
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
    if (values.length !== columns.length) {
      throw new Error(`INSERT column/value mismatch for ${table}: ${columns.length} columns, ${values.length} values`);
    }
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
        const am = /^"?([a-z_][a-z0-9_]*)"? = (.+)$/i.exec(assignment);
        if (!am) throw new Error(`Unsupported SET clause: ${assignment}`);
        const col = am[1];
        const rhs = am[2].trim();
        const add = /^([a-z_][a-z0-9_]*) \+ (\?\d+|-?\d+(?:\.\d+)?)$/i.exec(rhs);
        if (add && add[1] === col) {
          const current = Number(row[col]) || 0;
          row[col] = current + Number(valueOf(add[2], this.params));
        } else {
          row[col] = valueOf(rhs, this.params);
        }
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
    let deleted = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (matchesRow(rows[i], m[2], this.params)) {
        rows.splice(i, 1);
        deleted++;
      }
    }
    return deleted;
  }

  #select() {
    // listCategoriesFull() intentionally uses two aggregate LEFT JOIN
    // subqueries. The generic parser below only understands a single outer
    // WHERE and would mistake the first subquery WHERE for the category
    // filter, silently returning zero rows. Model this one canonical query
    // explicitly so the CRUD test exercises the service behavior accurately.
    if (/^select c\.\*, coalesce\(pc\.provider_count, 0\) as provider_count,/i.test(this.sql)) {
      return this.#selectCategoriesFull();
    }

    // SELECT COALESCE(AVG(col), 0) AS x, COUNT(*) AS y FROM t [WHERE ...]
    const aggregate = /^select coalesce\(avg\(([a-z_][a-z0-9_]*)\), 0\) as ([a-z_]+), count\(\*\) as ([a-z_]+) from ([a-z_][a-z0-9_]*)(.*)$/i.exec(this.sql);
    if (aggregate) {
      const [, column, avgAlias, countAlias, table, tail] = aggregate;
      const { where } = extractWhereAndTail(tail || "");
      const rows = this.db.table(table).filter((row) => matchesRow(row, where, this.params));
      const values = rows.map((row) => Number(row[column])).filter((value) => Number.isFinite(value));
      const total = values.reduce((sum, value) => sum + value, 0);
      return [{ [avgAlias]: values.length ? total / values.length : 0, [countAlias]: rows.length }];
    }

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
    const { where, orderBy, limit, offset } = extractWhereAndTail(m[4] || "");

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

    if (offset) {
      const n = Number(valueOf(offset, this.params));
      rows = rows.slice(n);
    }
    if (limit) {
      const n = Number(valueOf(limit, this.params));
      rows = rows.slice(0, n);
    }

    const normalizedColumns = colsRaw.replace(/^distinct\s+/i, "").trim();
    const isStar = normalizedColumns === "*" || /^[a-z_][a-z0-9_]*\.\*$/i.test(normalizedColumns);
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

  #selectCategoriesFull() {
    const outerJoin = ") rc ON rc.category_id = c.id";
    const outerTail = this.sql.slice(this.sql.lastIndexOf(outerJoin) + outerJoin.length);
    const { where } = extractWhereAndTail(outerTail);
    const profiles = this.db.table("service_provider_profiles");
    const providerCategories = this.db.table("service_provider_categories");
    const requests = this.db.table("service_requests");

    const rows = this.db.table("service_categories")
      .filter((category) => matchesRow(category, where, this.params))
      .map((category) => {
        const providerCount = providerCategories.filter((entry) => {
          if (!compare(entry, "category_id", category.id) || !compare(entry, "is_active", 1)) return false;
          const profile = profiles.find((candidate) => compare(candidate, "id", entry.provider_id));
          return profile?.status === "approved";
        }).length;
        const openRequestCount = requests.filter((request) =>
          compare(request, "category_id", category.id) && ["published", "receiving_offers"].includes(request.status),
        ).length;
        return { ...category, provider_count: providerCount, open_request_count: openRequestCount };
      });

    const compareNullable = (a, b) => {
      if (a == null && b == null) return 0;
      if (a == null) return -1;
      if (b == null) return 1;
      return String(a).localeCompare(String(b));
    };
    return rows.sort((a, b) =>
      compareNullable(a.parent_id, b.parent_id)
      || Number(b.is_featured ?? 0) - Number(a.is_featured ?? 0)
      || Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
      || String(a.code ?? "").localeCompare(String(b.code ?? "")),
    );
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

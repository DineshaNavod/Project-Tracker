// In-memory stand-in for the Supabase client. It imitates the call shapes the app uses.
// It is NOT real Supabase: it does not enforce Row Level Security.
export function fake(seed = {}, opts = {}) {
  const { fail = null, countOffset = 0 } = opts; // fail: { table?, afterCalls?, code?, message?, status?, throw? }
  const tables = { topics: [...(seed.topics || [])], projects: [...(seed.projects || [])] };
  const log = [];
  const calls = { topics: 0, projects: 0 };
  let id = 1;
  return { tables, log, from(name) {
    const q = { op: "select", f: [], o: [], r: null, p: null, single: false, ret: false, count: false };
    const bld = {
      select(_cols, o) { if (q.op !== "select") q.ret = true; else q.count = o?.count === "exact"; return bld; },
      insert(p) { q.op = "insert"; q.p = p; return bld; },
      update(p) { q.op = "update"; q.p = p; return bld; },
      delete() { q.op = "delete"; return bld; },
      eq(c, v) { q.f.push([c, v]); return bld; },
      order(c, x = {}) { q.o.push([c, x.ascending !== false]); return bld; },
      range(a, z) { q.r = [a, z]; return bld; },
      single() { q.single = true; return bld; },
      then(res, rej) { return Promise.resolve(exec()).then(res, rej); },
    };
    function err(code, message, status = 400) { return { data: null, error: { code, message }, status }; }
    function exec() {
      calls[name]++;
      log.push({ name, op: q.op, payload: q.p, filters: q.f, range: q.r });
      if (fail && (!fail.table || fail.table === name) && calls[name] > (fail.afterCalls ?? 0)) {
        if (fail.throw) throw new Error(fail.throw);
        return err(fail.code, fail.message, fail.status);
      }
      const T = tables[name];
      const match = (r) => q.f.every(([c, v]) => r[c] === v);
      if (q.op === "select") {
        let rows = T.filter(match);
        const total = rows.length;
        for (const [c, asc] of [...q.o].reverse()) rows = [...rows].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
        if (q.r) rows = rows.slice(q.r[0], q.r[1] + 1);
        return { data: rows, error: null, status: 200, count: q.count ? total + countOffset : null };
      }
      if (q.op === "insert") {
        if (name === "topics" && T.some((r) => r.title.toLowerCase() === q.p.title.toLowerCase())) return err("23505", "duplicate key");
        if (name === "projects" && !tables.topics.some((t) => t.id === q.p.topic_id)) return err("23503", "fk violation");
        const row = { id: `${name}-${id++}`, user_id: "u1", created_at: "2026-02-01T00:00:00+00:00", description: "", caption: "", technologies: [], links: [], ...q.p };
        T.push(row);
        return { data: q.single ? row : [row], error: null, status: 201 };
      }
      if (q.op === "update") {
        const rows = T.filter(match);
        if (!rows.length) return q.single ? err("PGRST116", "0 rows", 406) : { data: [], error: null, status: 200 };
        if (q.p.topic_id && !tables.topics.some((t) => t.id === q.p.topic_id)) return err("23503", "fk violation");
        rows.forEach((r) => Object.assign(r, q.p));
        return { data: q.single ? rows[0] : rows, error: null, status: 200 };
      }
      const rows = T.filter(match); // delete
      if (name === "topics" && rows.some((t) => tables.projects.some((p) => p.topic_id === t.id))) return err("23503", "fk violation");
      tables[name] = T.filter((r) => !match(r));
      return { data: rows.map((r) => ({ id: r.id })), error: null, status: 200 };
    }
    return bld;
  } };
}

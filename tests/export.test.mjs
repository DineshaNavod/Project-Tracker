import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fake } from "./helpers/fakeClient.mjs";

const src = new URL("../src/", import.meta.url).href;
const { createApi } = await import(src + "db/api.js");
const E = await import(src + "utils/exportData.js");
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };
const rejects = async (p, re, m) => {
  try { await p; } catch (e) { ok(re.test(e.message), `${m} - got: ${e.message}`); return e; }
  assert.fail("should have rejected: " + m);
};

const NOW = new Date(2026, 9, 16, 12, 0, 0);
const T = (id, title, uid = "u1", x = {}) => ({ id, user_id: uid, title, description: "", created_at: "2026-01-01T00:00:00.123456+00:00", updated_at: "2026-01-02T00:00:00.654321+00:00", ...x });
const P = (id, topic, title, uid = "u1", x = {}) => ({ id, user_id: uid, topic_id: topic, title, description: "", caption: "", technologies: [], status: "Planned", links: [], created_at: "2026-01-03T00:00:00+00:00", updated_at: "2026-01-03T00:00:00+00:00", ...x });
async function exportFor(client, uid = "u1") {
  const downloads = [];
  const result = await E.runExport({ api: createApi(client), userId: uid, download: (f, t) => downloads.push({ f, t }), now: NOW });
  return { result, downloads, backup: JSON.parse(downloads[0].t) };
}
const keysOf = (v, out = new Set()) => { if (Array.isArray(v)) v.forEach((x) => keysOf(x, out)); else if (v && typeof v === "object") for (const k of Object.keys(v)) { out.add(k); keysOf(v[k], out); } return out; };

// 1. empty account
{
  const { backup, downloads } = await exportFor(fake());
  eq(downloads.length, 1, "one download"); eq(backup.topics, []); eq(backup.projects, []); eq(backup.counts, { topics: 0, projects: 0 });
  eq(backup.format, "personal-project-tracker-backup"); eq(backup.formatVersion, 1); eq(backup.exportedAt, NOW.toISOString());
}

// 2 + 3 + 5 + 13. empty topic, project without links, multiple links, parseable, timestamps verbatim
{
  const links = [
    { id: "l1", title: "GitHub", url: "https://github.com/me/app" },
    { id: "l2", title: "Docker Hub", url: "https://hub.docker.com/r/me/app" },
    { id: "l3", title: "Live site", url: "https://app.example.com" },
    { id: "l4", title: "Demo video", url: "https://youtu.be/abc" },
    { id: "l5", title: "Docs", url: "https://docs.example.com/app" },
    { id: "l6", title: "Custom", url: "http://localhost:3000/x" },
  ];
  const c = fake({
    topics: [T("t1", "Docker"), T("t2", "Empty topic"), T("t3", "React")],
    projects: [P("p1", "t1", "Blog", "u1", { links, technologies: ["Docker", "Node.js"], status: "Completed", caption: "cap", description: "desc" }), P("p2", "t3", "No links project")],
  });
  const { backup, downloads } = await exportFor(c);
  eq(backup.counts, { topics: 3, projects: 2 });
  ok(backup.topics.some((t) => t.id === "t2" && t.title === "Empty topic"), "empty topic included");
  eq(backup.projects.find((p) => p.id === "p1").links, links, "all 6 links, in order");
  const bare = backup.projects.find((p) => p.id === "p2");
  eq(bare.links, [], "project without links keeps empty array"); eq(bare.technologies, []); eq(bare.caption, ""); eq(bare.description, "");
  const p1 = backup.projects.find((p) => p.id === "p1");
  eq([p1.topicId, p1.topicTitle, p1.status, p1.caption, p1.description, p1.technologies], ["t1", "Docker", "Completed", "cap", "desc", ["Docker", "Node.js"]]);
  eq(backup.topics[0].createdAt, "2026-01-01T00:00:00.123456+00:00", "timestamp kept verbatim"); eq(backup.topics[0].updatedAt, "2026-01-02T00:00:00.654321+00:00");
  eq(downloads[0].f, "project-tracker-backup-2026-10-16.json", "filename");
}

// 4. special characters + UTF-8 round trip through a real file
{
  const weird = "Quote \" backslash \\ <script>alert(1)</script> & é ñ 日本語 ව්‍යාපෘතිය தமிழ் 😀 العربية\nline2\ttab \u2028";
  const c = fake({ topics: [T("t1", weird, "u1", { description: weird })], projects: [P("p1", "t1", weird, "u1", { description: weird, caption: weird, technologies: [weird], links: [{ id: "l", title: weird, url: "https://例え.jp/ページ?q=a&b=é" }] })] });
  const { downloads, backup } = await exportFor(c);
  eq(backup.topics[0].title, weird); eq(backup.projects[0].description, weird); eq(backup.projects[0].links[0].url, "https://例え.jp/ページ?q=a&b=é");
  const file = path.join(os.tmpdir(), "tracker-utf8-test.json");
  fs.writeFileSync(file, downloads[0].t, "utf8");
  const bytes = fs.readFileSync(file);
  eq(bytes[0], 0x7b, "starts with { (no BOM)");
  eq(JSON.parse(bytes.toString("utf8")).projects[0].title, weird, "survives UTF-8 file round trip");
  fs.unlinkSync(file);
}

// 6. large dataset: no truncation, correct paging
{
  const topics = Array.from({ length: 2500 }, (_, i) => T("t" + String(i).padStart(5, "0"), "Topic " + i, "u1", { created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString() }));
  const projects = Array.from({ length: 5200 }, (_, i) => P("p" + String(i).padStart(5, "0"), topics[i % 2500].id, "Project " + i, "u1", { created_at: new Date(Date.UTC(2026, 1, 1, 0, 0, i)).toISOString() }));
  const c = fake({ topics, projects });
  const { backup } = await exportFor(c);
  eq(backup.topics.length, 2500); eq(backup.projects.length, 5200); eq(backup.counts, { topics: 2500, projects: 5200 });
  eq(new Set(backup.projects.map((p) => p.id)).size, 5200, "all project ids unique and present");
  eq(c.log.filter((l) => l.name === "topics").length, 3, "topics: 3 pages"); eq(c.log.filter((l) => l.name === "projects").length, 6, "projects: 6 pages");
  ok(backup.projects[0].createdAt < backup.projects[5199].createdAt, "oldest first");
}

// 6b. server returns fewer rows per page than requested (lower max-rows): still complete
{
  const topics = Array.from({ length: 30 }, (_, i) => T("t" + String(i).padStart(3, "0"), "T" + i));
  const c = fake({ topics });
  const orig = c.from.bind(c);
  c.from = (name) => { const b = orig(name); const r = b.range.bind(b); b.range = (a, z) => r(a, Math.min(z, a + 9)); return b; }; // cap pages at 10 rows
  const { backup } = await exportFor(c);
  eq(backup.topics.length, 30, "complete even when pages are capped at 10");
}

// 7. database failures: nothing is downloaded
{
  const topics = Array.from({ length: 2500 }, (_, i) => T("t" + i, "T" + i));
  const projects = Array.from({ length: 2500 }, (_, i) => P("p" + i, "t" + i, "P" + i));
  for (const [label, fail, re] of [
    ["second page of projects fails", { table: "projects", afterCalls: 1, code: "", message: "TypeError: Failed to fetch" }, /Could not reach/],
    ["topics fail immediately", { table: "topics", code: "42501", message: "rls", status: 403 }, /permission/],
    ["expired login", { code: "PGRST301", message: "JWT expired", status: 401 }, /session has expired/],
    ["thrown network error", { table: "projects", throw: "Failed to fetch" }, /Could not reach/],
  ]) {
    const downloads = [];
    await rejects(E.runExport({ api: createApi(fake({ topics, projects }, { fail })), userId: "u1", download: (f, t) => downloads.push(t) }), re, label);
    eq(downloads.length, 0, `no download: ${label}`);
  }
  // incomplete counts (server count disagrees with rows received)
  for (const off of [1, -1]) {
    const downloads = [];
    await rejects(E.runExport({ api: createApi(fake({ topics: [T("t1", "A")], projects: [] }, { countOffset: off })), userId: "u1", download: (f, t) => downloads.push(t) }), /incomplete/, `count offset ${off}`);
    eq(downloads.length, 0, "no download on count mismatch");
  }
  // inconsistent data: project whose topic was not loaded; duplicate ids
  const d2 = [];
  await rejects(E.runExport({ api: createApi(fake({ topics: [T("t1", "A")], projects: [P("p1", "ghost", "X")] })), userId: "u1", download: (f, t) => d2.push(t) }), /refers to a topic/, "orphan project");
  await rejects(E.runExport({ api: createApi(fake({ topics: [T("t1", "A"), T("t1", "B")] })), userId: "u1", download: (f, t) => d2.push(t) }), /duplicate/, "duplicate ids");
  eq(d2.length, 0, "no download for inconsistent data");
  await rejects(E.runExport({ api: createApi(fake()), userId: "", download: () => assert.fail("must not download") }), /signed in/, "no user");
}

// 8 + secrets. only the signed-in user's data, no secrets or user ids
{
  const c = fake({
    topics: [T("a1", "Mine", "u1"), T("b1", "Theirs", "u2")],
    projects: [P("pa", "a1", "My project", "u1"), P("pb", "b1", "Their project", "u2")],
  });
  const { backup, downloads } = await exportFor(c, "u1");
  eq(backup.topics.map((t) => t.id), ["a1"]); eq(backup.projects.map((p) => p.id), ["pa"]);
  ok(!/Theirs|Their project|u2|"b1"|"pb"/.test(downloads[0].t), "no other-user data in file");
  const reads = c.log.filter((l) => l.op === "select");
  ok(reads.length >= 2 && reads.every((l) => l.filters.some(([k, v]) => k === "user_id" && v === "u1")), "every read filtered by user_id");
  const bad = [...keysOf(backup)].filter((k) => /token|password|secret|apikey|api_key|user_?id|jwt|session/i.test(k));
  eq(bad, [], "no secret-like or user-id keys");
  ok(!/user_id|"u1"/.test(downloads[0].t), "user id not exported");
}

// filename
eq(E.backupFilename(new Date(2026, 9, 16)), "project-tracker-backup-2026-10-16.json");
eq(E.backupFilename(new Date(2026, 0, 5)), "project-tracker-backup-2026-01-05.json", "zero padded");

console.log(`all ${n} export checks passed`);

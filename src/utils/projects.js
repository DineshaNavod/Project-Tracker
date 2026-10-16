// Pure project helpers (no React, no database). Reused by Firestore (Stage 4) and export (Stage 5).
import { newId } from "./topics.js";

export const STATUSES = ["Planned", "In Progress", "Completed"];
export const LIMITS = {
  title: 120, caption: 160, description: 2000,
  linkTitle: 80, url: 2048, tech: 40, techCount: 30,
};

// "React, Node.js, react" -> ["React", "Node.js"] (trimmed, de-duplicated, order kept)
export function parseTechnologies(text) {
  const seen = new Set();
  const out = [];
  for (const raw of String(text ?? "").split(/[,\n]/)) {
    const t = raw.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}

// Accepts only http(s) URLs with a real host. Returns { url } or { error }.
export function normalizeUrl(input) {
  const v = String(input ?? "").trim();
  const bad = { error: "Enter a valid URL starting with http:// or https://." };
  if (!v) return { error: "Enter a URL." };
  if (v.length > LIMITS.url) return { error: `URL must be ${LIMITS.url} characters or fewer.` };
  if (/\s/.test(v)) return bad;
  let u;
  try { u = new URL(v); } catch { return bad; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return bad;
  if (!u.hostname.includes(".") && u.hostname !== "localhost") return bad;
  return { url: v };
}

// values: raw form values. Returns { errors, cleaned }; errors is empty when valid.
export function validateProject(values, topics) {
  const errors = {};
  const title = values.title.trim();
  const caption = values.caption.trim();
  const description = values.description.trim();
  const technologies = parseTechnologies(values.technologies);

  if (!values.topicId || !topics.some((t) => t.id === values.topicId)) errors.topicId = "Choose an existing topic.";
  if (!title) errors.title = "Enter a project title.";
  else if (title.length > LIMITS.title) errors.title = `Title must be ${LIMITS.title} characters or fewer.`;
  if (caption.length > LIMITS.caption) errors.caption = `Caption must be ${LIMITS.caption} characters or fewer.`;
  if (description.length > LIMITS.description) errors.description = `Description must be ${LIMITS.description} characters or fewer.`;
  if (!STATUSES.includes(values.status)) errors.status = "Choose a status.";
  if (technologies.length > LIMITS.techCount) errors.technologies = `Use at most ${LIMITS.techCount} technologies.`;
  else if (technologies.some((t) => t.length > LIMITS.tech)) errors.technologies = `Each technology must be ${LIMITS.tech} characters or fewer.`;

  const linkErrors = [];
  const links = [];
  let linkBad = false;
  for (const l of values.links) {
    const lt = l.title.trim();
    const lu = l.url.trim();
    if (!lt && !lu) { linkErrors.push(null); continue; } // fully blank row is ignored
    const e = {};
    if (!lt) e.title = "Enter a link title.";
    else if (lt.length > LIMITS.linkTitle) e.title = `Link title must be ${LIMITS.linkTitle} characters or fewer.`;
    const r = normalizeUrl(lu);
    if (r.error) e.url = r.error;
    if (e.title || e.url) { linkBad = true; linkErrors.push(e); }
    else { linkErrors.push(null); links.push({ id: l.id || newId(), title: lt, url: lu }); }
  }
  if (linkBad) errors.links = linkErrors;

  return {
    errors,
    cleaned: { topicId: values.topicId, title, description, caption, technologies, status: values.status, links },
  };
}

export function createProject(cleaned) {
  return { id: newId(), createdAt: new Date().toISOString(), ...cleaned };
}

// Keeps id and createdAt from the existing record.
export function updateProject(existing, cleaned) {
  return { ...existing, ...cleaned, id: existing.id, createdAt: existing.createdAt };
}

export function moveProject(projects, projectId, topicId, topics) {
  if (!topics.some((t) => t.id === topicId)) return { error: "That topic no longer exists." };
  if (!projects.some((p) => p.id === projectId)) return { error: "Project not found." };
  return { projects: projects.map((p) => (p.id === projectId ? { ...p, topicId } : p)) };
}

export function filterProjects(projects, { query = "", topicId = "" } = {}) {
  const q = query.trim().toLowerCase();
  return projects.filter((p) => {
    if (topicId && p.topicId !== topicId) return false;
    if (!q) return true;
    return (p.title ?? "").toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
  });
}

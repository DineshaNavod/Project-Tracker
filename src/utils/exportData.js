// Builds the JSON backup. Pure functions (no React, no Supabase) so they can be tested.
export const BACKUP_FORMAT = "personal-project-tracker-backup";
export const BACKUP_VERSION = 1;

export function backupFilename(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `project-tracker-backup-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`;
}

function assertUniqueIds(list, what) {
  if (new Set(list.map((r) => r.id)).size !== list.length) {
    throw new Error(`The backup was cancelled: duplicate ${what} were returned. Please try again.`);
  }
}

// rows = raw database rows { topics: [...], projects: [...] }. Throws if the data is inconsistent.
export function buildBackup(rows, now = new Date()) {
  assertUniqueIds(rows.topics, "topics");
  assertUniqueIds(rows.projects, "projects");
  const titles = new Map(rows.topics.map((t) => [t.id, t.title]));
  if (rows.projects.some((p) => !titles.has(p.topic_id))) {
    throw new Error("The backup was cancelled: a project refers to a topic that was not loaded. Your data may have changed while exporting. Please try again.");
  }

  const topics = rows.topics.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    createdAt: t.created_at,
    updatedAt: t.updated_at ?? null,
  }));

  const projects = rows.projects.map((p) => ({
    id: p.id,
    topicId: p.topic_id,
    topicTitle: titles.get(p.topic_id), // convenience copy so the file reads well without lookups
    title: p.title,
    description: p.description ?? "",
    caption: p.caption ?? "",
    technologies: Array.isArray(p.technologies) ? p.technologies : [],
    status: p.status,
    links: Array.isArray(p.links) ? p.links.map((l) => ({ id: l.id, title: l.title, url: l.url })) : [],
    createdAt: p.created_at,
    updatedAt: p.updated_at ?? null,
  }));

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    counts: { topics: topics.length, projects: projects.length },
    topics,
    projects,
  };
}

// Returns { json, filename, counts }. The JSON text is parsed back to prove it is valid.
export function createBackup(rows, now = new Date()) {
  const backup = buildBackup(rows, now);
  const json = JSON.stringify(backup, null, 2);
  const check = JSON.parse(json);
  if (
    check.topics.length !== rows.topics.length ||
    check.projects.length !== rows.projects.length ||
    check.counts.topics !== check.topics.length ||
    check.counts.projects !== check.projects.length
  ) {
    throw new Error("The backup failed its final check and was cancelled. Please try again.");
  }
  return { json, filename: backupFilename(now), counts: backup.counts };
}

// Fetch everything, build and verify the file, and ONLY THEN hand it to `download`.
// Any failure throws before `download` is called, so a partial backup is never produced.
export async function runExport({ api, userId, download, now = new Date() }) {
  if (!userId) throw new Error("You must be signed in to export your data.");
  const rows = await api.fetchForExport(userId);
  const backup = createBackup(rows, now);
  download(backup.filename, backup.json);
  return { filename: backup.filename, counts: backup.counts };
}

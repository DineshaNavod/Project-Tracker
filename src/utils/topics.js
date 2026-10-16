// Pure topic helpers (no React, no database) so they are easy to test and reuse in Stage 4.
export const TITLE_MAX = 80;
export const DESC_MAX = 500;

export function validateTopic({ title, description }, existingTopics, editingId = null) {
  const errors = {};
  const t = title.trim();
  if (!t) {
    errors.title = "Enter a topic title.";
  } else if (t.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
  } else if (
    existingTopics.some((x) => x.id !== editingId && x.title.trim().toLowerCase() === t.toLowerCase())
  ) {
    errors.title = "A topic with this title already exists.";
  }
  if (description.trim().length > DESC_MAX) {
    errors.description = `Description must be ${DESC_MAX} characters or fewer.`;
  }
  return errors;
}

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTopic({ title, description }) {
  return {
    id: newId(),
    title: title.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function getProjectCount(topicId, projects) {
  return projects.filter((p) => p.topicId === topicId).length;
}

// Stage 3 will fill `projects`; deletion is already blocked while a topic still has any.
export function canDeleteTopic(topicId, projects) {
  return getProjectCount(topicId, projects) === 0;
}

export function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Unknown date" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

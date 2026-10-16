// Converts between database rows (snake_case) and app objects (camelCase), and turns
// Supabase errors into messages a beginner can act on. No Supabase import, so it is testable.

export function toTopic(r) {
  return { id: r.id, title: r.title, description: r.description ?? "", createdAt: r.created_at };
}

export function toProject(r) {
  return {
    id: r.id,
    topicId: r.topic_id,
    title: r.title,
    description: r.description ?? "",
    caption: r.caption ?? "",
    technologies: Array.isArray(r.technologies) ? r.technologies : [],
    status: r.status,
    createdAt: r.created_at,
    links: Array.isArray(r.links) ? r.links : [],
  };
}

export function isAuthError(e) {
  return e?.status === 401 || e?.code === "PGRST301" || e?.code === "PGRST303" || /jwt|not authenticated/i.test(e?.message ?? "");
}

// overrides lets one call give a better message for a specific error code.
export function friendlyError(e, fallback, overrides = {}) {
  const msg = e?.message ?? "";
  if (isAuthError(e)) return "Your session has expired. Please log in again.";
  if (e?.code && overrides[e.code]) return overrides[e.code];
  if (/failed to fetch|networkerror|network request|load failed/i.test(msg)) {
    return "Could not reach Supabase. Check your internet connection and try again.";
  }
  switch (e?.code) {
    case "23505": return "A topic with this title already exists.";
    case "23503": return "The related topic or project is missing or still in use. Reload the page and try again.";
    case "23514": return "The database rejected a value as invalid. Check lengths and links, then try again.";
    case "42501": return "You don't have permission to do that.";
    case "PGRST116": return "That record was not found. It may have been deleted on another device. Reload the page.";
  }
  return `${fallback}${msg ? ` (${msg})` : ""}`;
}

export function makeError(raw, fallback, overrides) {
  const err = new Error(friendlyError(raw, fallback, overrides));
  err.isAuth = isAuthError(raw);
  err.code = raw?.code;
  return err;
}

export function authMessage(err) {
  const msg = err?.message ?? "";
  if (/failed to fetch|networkerror|network request|load failed/i.test(msg)) {
    return "Could not reach Supabase. Check your internet connection and try again.";
  }
  return msg || "Something went wrong. Please try again.";
}

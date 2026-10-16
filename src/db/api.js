// All database operations live here, away from the UI. Every call is filtered by Row Level Security
// to the signed-in user; user_id is filled in by the database, never sent from the browser.
import { toTopic, toProject, makeError } from "./mapping.js";

const PAGE = 1000; // Supabase returns at most 1000 rows per request, so we page through.
const TOPIC_IN_USE = { "23503": "This topic still contains projects. Move or delete them first." };
const TOPIC_MISSING = { "23503": "The selected topic no longer exists. Reload the page and try again." };

export function createApi(client) {
  async function run(fn, fallback, overrides) {
    let res;
    try {
      res = await fn();
    } catch (e) {
      throw makeError({ message: String(e?.message ?? e) }, fallback, overrides);
    }
    if (res.error) {
      throw makeError({ message: res.error.message, code: res.error.code, status: res.status }, fallback, overrides);
    }
    return res;
  }

  async function fetchAllRows(table) {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const res = await run(
        () => client.from(table).select("*").order("created_at", { ascending: false }).order("id").range(from, from + PAGE - 1),
        `Could not load your ${table}.`
      );
      rows.push(...(res.data ?? []));
      if ((res.data ?? []).length < PAGE) return rows;
    }
  }

  // For backups: only this user's rows, oldest first, paged, and verified against the server's exact count.
  // If the count does not match what we received, we throw instead of returning partial data.
  async function fetchAllRowsExact(table, userId) {
    const rows = [];
    let total = null;
    for (let from = 0; ; from = rows.length) {
      const res = await run(
        () => client.from(table).select("*", { count: "exact" }).eq("user_id", userId)
          .order("created_at", { ascending: true }).order("id").range(from, from + PAGE - 1),
        `Could not read your ${table} for the backup.`
      );
      const page = res.data ?? [];
      rows.push(...page);
      total = res.count;
      if (page.length === 0 || (typeof total === "number" && rows.length >= total)) break;
    }
    if (typeof total !== "number" || rows.length !== total) {
      throw new Error(
        `The backup was incomplete (${table}: received ${rows.length}${typeof total === "number" ? ` of ${total}` : ""}), ` +
        "or your data changed while exporting. Nothing was downloaded. Please try again."
      );
    }
    return rows;
  }

  const projectPayload = (c) => ({
    topic_id: c.topicId,
    title: c.title.trim(),
    description: c.description.trim(),
    caption: c.caption.trim(),
    technologies: c.technologies,
    status: c.status,
    links: c.links.map(({ id, title, url }) => ({ id, title, url })),
  });

  async function deleteOne(table, id, fallback, overrides) {
    const res = await run(() => client.from(table).delete().eq("id", id).select("id"), fallback, overrides);
    if (!res.data?.length) throw makeError({ code: "PGRST116" }, fallback);
  }

  return {
    // Resolves only if BOTH tables loaded completely; otherwise throws (never partial data).
    async fetchAll() {
      const [topics, projects] = await Promise.all([fetchAllRows("topics"), fetchAllRows("projects")]);
      return { topics: topics.map(toTopic), projects: projects.map(toProject) };
    },
    // Resolves only if BOTH tables were read completely; otherwise throws (never partial data).
    async fetchForExport(userId) {
      if (!userId) throw new Error("You must be signed in to export your data.");
      const [topics, projects] = await Promise.all([fetchAllRowsExact("topics", userId), fetchAllRowsExact("projects", userId)]);
      return { topics, projects };
    },
    async insertTopic(v) {
      const res = await run(
        () => client.from("topics").insert({ title: v.title.trim(), description: v.description.trim() }).select().single(),
        "Could not save the topic."
      );
      return toTopic(res.data);
    },
    async updateTopic(id, v) {
      const res = await run(
        () => client.from("topics").update({ title: v.title.trim(), description: v.description.trim() }).eq("id", id).select().single(),
        "Could not update the topic."
      );
      return toTopic(res.data);
    },
    deleteTopic: (id) => deleteOne("topics", id, "Could not delete the topic.", TOPIC_IN_USE),
    async insertProject(c) {
      const res = await run(() => client.from("projects").insert(projectPayload(c)).select().single(), "Could not save the project.", TOPIC_MISSING);
      return toProject(res.data);
    },
    async updateProject(id, c) {
      const res = await run(() => client.from("projects").update(projectPayload(c)).eq("id", id).select().single(), "Could not update the project.", TOPIC_MISSING);
      return toProject(res.data);
    },
    async moveProject(id, topicId) {
      const res = await run(() => client.from("projects").update({ topic_id: topicId }).eq("id", id).select().single(), "Could not move the project.", TOPIC_MISSING);
      return toProject(res.data);
    },
    deleteProject: (id) => deleteOne("projects", id, "Could not delete the project."),
  };
}

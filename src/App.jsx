import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import StatCard from "./components/StatCard.jsx";
import TopicList from "./components/TopicList.jsx";
import TopicForm from "./components/TopicForm.jsx";
import TopicDetail from "./components/TopicDetail.jsx";
import ConfirmDeleteTopic from "./components/ConfirmDeleteTopic.jsx";
import ProjectList from "./components/ProjectList.jsx";
import ProjectForm from "./components/ProjectForm.jsx";
import ProjectDetail from "./components/ProjectDetail.jsx";
import ConfirmDeleteProject from "./components/ConfirmDeleteProject.jsx";
import { moveProject, filterProjects } from "./utils/projects.js";
import { runExport } from "./utils/exportData.js";
import { downloadTextFile } from "./utils/download.js";
import { api } from "./db/index.js";

// Stage 4: data is saved in Supabase. The screen is only updated AFTER the database confirms a change.
export default function App({ user, onSignOut, onSessionExpired }) {
  const [topics, setTopics] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // "loading" | "ready" | "error"
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filterTopicId, setFilterTopicId] = useState("");
  // dialog: null | { type: "add"|"edit"|"view"|"delete"|"addProject"|"editProject"|"viewProject"|"deleteProject", id?, topicId? }
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState(null); // { type: "ok" | "error", text }
  const exportingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Turns an error into a message; an expired login also sends the user back to the login screen.
  const fail = useCallback((err) => {
    if (err?.isAuth) onSessionExpired();
    return err?.message || "Something went wrong. Please try again.";
  }, [onSessionExpired]);

  const load = useCallback(async () => {
    setLoadState("loading");
    setLoadError("");
    try {
      const data = await api.fetchAll(); // both tables, complete, or an error
      setTopics(data.topics);
      setProjects(data.projects);
      setLoadState("ready");
    } catch (err) {
      setLoadError(fail(err));
      setLoadState("error");
    }
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  const activeTopic = dialog?.id && dialog.type.indexOf("Project") === -1 ? topics.find((t) => t.id === dialog.id) : null;
  const activeProject = dialog?.id && dialog.type.indexOf("Project") !== -1 ? projects.find((p) => p.id === dialog.id) : null;
  const close = () => setDialog(null);

  // A filter pointing at a deleted topic is treated as "All topics".
  const effectiveFilter = topics.some((t) => t.id === filterTopicId) ? filterTopicId : "";
  const visibleProjects = filterProjects(projects, { query, topicId: effectiveFilter });

  // The save/delete handlers below return an error message, or null when the database confirmed success.
  async function saveTopic(values) {
    try {
      if (dialog.type === "edit" && activeTopic) {
        const row = await api.updateTopic(activeTopic.id, values);
        setTopics((prev) => prev.map((t) => (t.id === row.id ? row : t)));
        setNotice("Topic updated.");
      } else {
        const row = await api.insertTopic(values);
        setTopics((prev) => [row, ...prev]);
        setNotice("Topic added.");
      }
      close();
      return null;
    } catch (err) {
      return fail(err);
    }
  }

  async function deleteTopic() {
    if (!activeTopic) return null;
    if (projects.some((p) => p.topicId === activeTopic.id)) return "This topic still contains projects. Move or delete them first.";
    try {
      await api.deleteTopic(activeTopic.id); // the database also refuses if projects exist
      setTopics((prev) => prev.filter((t) => t.id !== activeTopic.id));
      setNotice("Topic deleted.");
      close();
      return null;
    } catch (err) {
      return fail(err);
    }
  }

  async function saveProject(cleaned) {
    try {
      if (dialog.type === "editProject" && activeProject) {
        const row = await api.updateProject(activeProject.id, cleaned);
        setProjects((prev) => prev.map((p) => (p.id === row.id ? row : p)));
        setNotice("Project updated.");
      } else {
        const row = await api.insertProject(cleaned);
        setProjects((prev) => [row, ...prev]);
        setNotice("Project added.");
      }
      close();
      return null;
    } catch (err) {
      return fail(err);
    }
  }

  async function deleteProject() {
    if (!activeProject) return null;
    try {
      await api.deleteProject(activeProject.id);
      setProjects((prev) => prev.filter((p) => p.id !== activeProject.id));
      setNotice("Project deleted.");
      close();
      return null;
    } catch (err) {
      return fail(err);
    }
  }

  async function handleMove(topicId) {
    const check = moveProject(projects, activeProject.id, topicId, topics);
    if (check.error) return { error: check.error };
    try {
      const row = await api.moveProject(activeProject.id, topicId);
      setProjects((prev) => prev.map((p) => (p.id === row.id ? row : p)));
      const name = topics.find((t) => t.id === topicId).title;
      setNotice(`Project moved to “${name}”.`);
      return { ok: true, topicName: name };
    } catch (err) {
      return { error: fail(err) };
    }
  }

  async function handleExport() {
    if (exportingRef.current) return; // ignore double clicks while a backup is running
    exportingRef.current = true;
    setExporting(true);
    setExportMsg(null);
    try {
      const result = await runExport({
        api,
        userId: user.id,
        download: (filename, text) => {
          if (!mounted.current) throw new Error("Export cancelled because you signed out.");
          downloadTextFile(filename, text);
        },
      });
      const { topics: t, projects: p } = result.counts;
      setExportMsg({ type: "ok", text: `Backup created and download started: ${result.filename} (${t} ${t === 1 ? "topic" : "topics"}, ${p} ${p === 1 ? "project" : "projects"}). Keep the file somewhere safe.` });
    } catch (err) {
      setExportMsg({ type: "error", text: `Export failed, no file was downloaded. ${fail(err)}` });
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }

  function viewTopicProjects(topicId) {
    setFilterTopicId(topicId);
    close();
    setTimeout(() => document.getElementById("projects")?.scrollIntoView(), 0);
  }

  return (
    <div className="app">
      <Header query={query} onQueryChange={setQuery} userEmail={user.email} onSignOut={onSignOut} onExport={handleExport} exporting={exporting} />
      <main className="main">
        {notice && (
          <p className="notice" role="status">
            {notice}
            <button className="link-btn" onClick={() => setNotice("")}>Dismiss</button>
          </p>
        )}

        {exportMsg && (
          <p className={exportMsg.type === "ok" ? "notice" : "notice notice-error"} role={exportMsg.type === "ok" ? "status" : "alert"}>
            {exportMsg.text}
            <button className="link-btn" onClick={() => setExportMsg(null)}>Dismiss</button>
          </p>
        )}

        {loadState === "loading" && <p className="center-msg" role="status">Loading your topics and projects…</p>}

        {loadState === "error" && (
          <div className="empty" role="alert">
            <h2>Could not load your data</h2>
            <p>{loadError}</p>
            <button className="btn btn-primary" onClick={load}>Try again</button>
          </div>
        )}

        {loadState === "ready" && (
          <>
            <section className="stats" aria-label="Overview">
              <StatCard label="Topics" value={topics.length} />
              <StatCard label="Projects" value={projects.length} />
            </section>
            <TopicList
              topics={topics}
              projects={projects}
              onAdd={() => setDialog({ type: "add" })}
              onView={(id) => setDialog({ type: "view", id })}
              onEdit={(id) => setDialog({ type: "edit", id })}
              onDelete={(id) => setDialog({ type: "delete", id })}
              onViewProjects={viewTopicProjects}
              onAddProject={(topicId) => setDialog({ type: "addProject", topicId })}
            />
            <ProjectList
              projects={visibleProjects}
              totalCount={projects.length}
              topics={topics}
              filterTopicId={effectiveFilter}
              query={query}
              onFilterChange={setFilterTopicId}
              onClear={() => { setQuery(""); setFilterTopicId(""); }}
              onAdd={() => setDialog({ type: "addProject", topicId: effectiveFilter })}
              onView={(id) => setDialog({ type: "viewProject", id })}
            />
          </>
        )}
      </main>

      {dialog?.type === "add" && <TopicForm topic={null} topics={topics} onSave={saveTopic} onCancel={close} />}
      {dialog?.type === "edit" && activeTopic && (
        <TopicForm key={activeTopic.id} topic={activeTopic} topics={topics} onSave={saveTopic} onCancel={close} />
      )}
      {dialog?.type === "view" && activeTopic && (
        <TopicDetail
          topic={activeTopic}
          projects={projects}
          onClose={close}
          onEdit={() => setDialog({ type: "edit", id: activeTopic.id })}
          onDelete={() => setDialog({ type: "delete", id: activeTopic.id })}
          onOpenProject={(id) => setDialog({ type: "viewProject", id })}
          onAddProject={(topicId) => setDialog({ type: "addProject", topicId })}
        />
      )}
      {dialog?.type === "delete" && activeTopic && (
        <ConfirmDeleteTopic topic={activeTopic} projects={projects} onConfirm={deleteTopic} onCancel={close} />
      )}

      {dialog?.type === "addProject" && (
        <ProjectForm project={null} defaultTopicId={dialog.topicId} topics={topics} onSave={saveProject} onCancel={close} />
      )}
      {dialog?.type === "editProject" && activeProject && (
        <ProjectForm key={activeProject.id} project={activeProject} topics={topics} onSave={saveProject} onCancel={close} />
      )}
      {dialog?.type === "viewProject" && activeProject && (
        <ProjectDetail
          key={activeProject.id}
          project={activeProject}
          topics={topics}
          onClose={close}
          onEdit={() => setDialog({ type: "editProject", id: activeProject.id })}
          onDelete={() => setDialog({ type: "deleteProject", id: activeProject.id })}
          onMove={handleMove}
        />
      )}
      {dialog?.type === "deleteProject" && activeProject && (
        <ConfirmDeleteProject project={activeProject} onConfirm={deleteProject} onCancel={close} />
      )}
    </div>
  );
}

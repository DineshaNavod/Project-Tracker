import { useState } from "react";
import Modal from "./Modal.jsx";
import { formatDate } from "../utils/topics.js";
import { normalizeUrl } from "../utils/projects.js";

// onMove(topicId) returns { ok, topicName } or { error }.
export default function ProjectDetail({ project, topics, onEdit, onDelete, onMove, onClose }) {
  const [target, setTarget] = useState("");
  const [moveMsg, setMoveMsg] = useState(null);
  const [moving, setMoving] = useState(false);
  const topic = topics.find((t) => t.id === project.topicId);
  const otherTopics = topics.filter((t) => t.id !== project.topicId);
  const links = project.links ?? [];
  const techs = project.technologies ?? [];

  async function handleMove() {
    if (moving) return;
    if (!target) { setMoveMsg({ error: "Choose a topic to move this project to." }); return; }
    setMoving(true);
    setMoveMsg(null);
    const res = await onMove(target); // { ok, topicName } or { error }
    setMoving(false);
    setMoveMsg(res.error ? { error: res.error } : { ok: `Moved to “${res.topicName}”.` });
    if (!res.error) setTarget("");
  }

  return (
    <Modal title={project.title} onClose={onClose} wide>
      <p>
        <span className={`badge badge-${project.status.toLowerCase().replace(" ", "-")}`}>{project.status}</span>{" "}
        <span className="muted small">Topic: {topic ? topic.title : "Unknown topic"} · Created {formatDate(project.createdAt)}</span>
      </p>
      {project.caption && <p><strong>{project.caption}</strong></p>}
      <p className="detail-text">{project.description || <span className="muted">No description.</span>}</p>

      <div>
        <h3>Technologies</h3>
        {techs.length ? <span className="chips">{techs.map((t) => <span className="chip" key={t}>{t}</span>)}</span> : <p className="muted small">None listed.</p>}
      </div>

      <div>
        <h3>Links</h3>
        {links.length === 0 && <p className="muted small">No links.</p>}
        <ul className="link-list">
          {links.map((l) => (
            <li key={l.id}>
              {normalizeUrl(l.url).url
                ? <a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a>
                : <span>{l.title} <span className="muted small">(invalid URL: {l.url})</span></span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="move">
        <h3>Move to another topic</h3>
        {otherTopics.length === 0 && topic ? (
          <p className="muted small">Create another topic to move this project.</p>
        ) : (
          <div className="move-row">
            <select aria-label="Move to topic" value={target} onChange={(e) => { setTarget(e.target.value); setMoveMsg(null); }}>
              <option value="">Choose a topic</option>
              {otherTopics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button className="btn" onClick={handleMove} disabled={moving}>{moving ? "Moving…" : "Move project"}</button>
          </div>
        )}
        {moveMsg?.error && <span className="error" role="alert">{moveMsg.error}</span>}
        {moveMsg?.ok && <span className="ok" role="status">{moveMsg.ok}</span>}
      </div>

      <div className="actions">
        <button className="btn" onClick={onClose}>Close</button>
        <button className="btn" onClick={onEdit}>Edit</button>
        <button className="btn btn-danger" onClick={onDelete}>Delete</button>
      </div>
    </Modal>
  );
}

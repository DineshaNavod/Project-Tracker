import Modal from "./Modal.jsx";
import { formatDate } from "../utils/topics.js";

export default function TopicDetail({ topic, projects, onEdit, onDelete, onClose, onOpenProject, onAddProject }) {
  const own = projects.filter((p) => p.topicId === topic.id);
  return (
    <Modal title={topic.title} onClose={onClose}>
      <p className="detail-text">{topic.description || <span className="muted">No description.</span>}</p>
      <p className="muted small">Created {formatDate(topic.createdAt)} · {own.length} {own.length === 1 ? "project" : "projects"}</p>
      <div>
        <h3>Projects</h3>
        {own.length === 0 ? <p className="muted small">No projects in this topic yet.</p> : (
          <ul className="link-list">
            {own.map((p) => (
              <li key={p.id}><button className="link-btn" onClick={() => onOpenProject(p.id)}>{p.title}</button> <span className="muted small">({p.status})</span></li>
            ))}
          </ul>
        )}
      </div>
      <div className="actions">
        <button className="btn" onClick={onClose}>Close</button>
        <button className="btn" onClick={() => onAddProject(topic.id)}>Add project</button>
        <button className="btn" onClick={onEdit}>Edit</button>
        <button className="btn btn-danger" onClick={onDelete}>Delete</button>
      </div>
    </Modal>
  );
}

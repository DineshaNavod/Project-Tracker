import { formatDate, getProjectCount } from "../utils/topics.js";

export default function TopicList({ topics, projects, onAdd, onView, onEdit, onDelete, onViewProjects, onAddProject }) {
  if (topics.length === 0) {
    return (
      <section className="empty">
        <h2>No topics yet</h2>
        <p>
          Topics group your projects, such as Docker, React or University
          Projects. Add your first topic to get started.
        </p>
        <button className="btn btn-primary" onClick={onAdd}>Add topic</button>
      </section>
    );
  }

  return (
    <section aria-label="Topics">
      <div className="section-head">
        <h2>Topics</h2>
        <button className="btn btn-primary" onClick={onAdd}>Add topic</button>
      </div>
      <div className="topics">
        {topics.map((t) => {
          const count = getProjectCount(t.id, projects);
          return (
            <article className="topic" key={t.id}>
              <h3>{t.title}</h3>
              {t.description && <p className="clamp">{t.description}</p>}
              <p className="muted small">
                {count} {count === 1 ? "project" : "projects"} · Created {formatDate(t.createdAt)}
              </p>
              <div className="actions">
                <button className="btn" onClick={() => onViewProjects(t.id)}>View projects ({count})</button>
                <button className="btn" onClick={() => onAddProject(t.id)}>Add project</button>
              </div>
              <div className="actions">
                <button className="btn" onClick={() => onView(t.id)}>Details</button>
                <button className="btn" onClick={() => onEdit(t.id)}>Edit</button>
                <button className="btn btn-danger" onClick={() => onDelete(t.id)}>Delete</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

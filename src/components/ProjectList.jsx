export default function ProjectList({ projects, totalCount, topics, filterTopicId, query, onFilterChange, onClear, onAdd, onView }) {
  const topicName = (id) => topics.find((t) => t.id === id)?.title ?? "Unknown topic";

  let body;
  if (topics.length === 0) {
    body = <p className="muted">Add a topic first, then you can add projects to it.</p>;
  } else if (totalCount === 0) {
    body = (
      <div className="empty">
        <h3>No projects yet</h3>
        <p>Add your first project to one of your topics.</p>
        <button className="btn btn-primary" onClick={onAdd}>Add project</button>
      </div>
    );
  } else if (projects.length === 0) {
    body = (
      <p className="muted">
        No projects match your search or filter.{" "}
        <button className="link-btn" onClick={onClear}>Clear search and filter</button>
      </p>
    );
  } else {
    body = (
      <div className="topics">
        {projects.map((p) => (
          <article className="topic" key={p.id}>
            <h3>{p.title}</h3>
            <p>
              <span className={`badge badge-${p.status.toLowerCase().replace(" ", "-")}`}>{p.status}</span>{" "}
              <span className="muted small">{topicName(p.topicId)}</span>
            </p>
            {p.caption && <p className="clamp">{p.caption}</p>}
            {p.technologies?.length > 0 && (
              <span className="chips">
                {p.technologies.slice(0, 5).map((t) => <span className="chip" key={t}>{t}</span>)}
                {p.technologies.length > 5 && <span className="muted small">+{p.technologies.length - 5} more</span>}
              </span>
            )}
            <p className="muted small">{p.links?.length ?? 0} {(p.links?.length ?? 0) === 1 ? "link" : "links"}</p>
            <div className="actions"><button className="btn" onClick={() => onView(p.id)}>View details</button></div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <section id="projects" aria-label="Projects">
      <div className="section-head">
        <h2>Projects</h2>
        <div className="actions inline">
          <select aria-label="Filter by topic" value={filterTopicId} onChange={(e) => onFilterChange(e.target.value)} disabled={topics.length === 0}>
            <option value="">All topics</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button className="btn btn-primary" onClick={onAdd} disabled={topics.length === 0}>Add project</button>
        </div>
      </div>
      {body}
    </section>
  );
}

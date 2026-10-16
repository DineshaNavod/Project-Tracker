export default function Header({ query, onQueryChange, userEmail, onSignOut, onExport, exporting }) {
  return (
    <header className="header">
      <h1 className="title">Project Tracker</h1>
      <input
        type="search"
        className="search"
        placeholder="Search projects by title or description"
        aria-label="Search projects"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <button className="btn" onClick={onExport} disabled={exporting}>
        {exporting ? "Preparing backup…" : "Export All Data (JSON)"}
      </button>
      <span className="user muted small">{userEmail}</span>
      <button className="btn" onClick={onSignOut}>Log out</button>
    </header>
  );
}

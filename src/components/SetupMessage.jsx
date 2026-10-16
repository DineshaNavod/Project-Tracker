export default function SetupMessage({ problem }) {
  return (
    <div className="auth">
      <h1 className="title">Project Tracker</h1>
      <div className="panel">
        <h2>Supabase is not set up yet</h2>
        <p className="error" role="alert">{problem}</p>
        <ol className="setup-steps">
          <li>Create a Supabase project and run <code>supabase/schema.sql</code> in its SQL Editor.</li>
          <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
          <li>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (the publishable key, never a secret key).</li>
          <li>Stop and restart <code>npm run dev</code>.</li>
        </ol>
        <p className="muted small">The README has the full step-by-step guide.</p>
      </div>
    </div>
  );
}

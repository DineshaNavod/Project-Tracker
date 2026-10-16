import { useRef, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { authMessage } from "../db/mapping.js";

export default function AuthScreen({ notice }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const submitting = useRef(false);
  const signup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current) return;
    const mail = email.trim();
    if (!mail.includes("@")) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    if (signup && password.length < 8) return setError("Use a password with at least 8 characters.");

    submitting.current = true;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (signup) {
        const { data, error: err } = await supabase.auth.signUp({ email: mail, password });
        if (err) throw err;
        if (!data.session) {
          // Email confirmation is on: the user must click the link in their email first.
          setInfo("Account created. Check your email and confirm your address, then log in.");
          setMode("login");
          setPassword("");
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <h1 className="title">Project Tracker</h1>
      <form className="panel form" onSubmit={handleSubmit} noValidate>
        <h2>{signup ? "Create account" : "Log in"}</h2>
        {notice && <p className="banner" role="status">{notice}</p>}
        {info && <p className="notice" role="status">{info}</p>}
        <label>
          Email
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" autoComplete={signup ? "new-password" : "current-password"} value={password}
            onChange={(e) => setPassword(e.target.value)} />
          {signup && <span className="muted small">At least 8 characters.</span>}
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? (signup ? "Creating account…" : "Logging in…") : signup ? "Create account" : "Log in"}
        </button>
        <button type="button" className="link-btn" disabled={busy}
          onClick={() => { setMode(signup ? "login" : "signup"); setError(""); setInfo(""); }}>
          {signup ? "Already have an account? Log in" : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}

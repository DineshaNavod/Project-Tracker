import { useEffect, useState } from "react";
import { supabase, isConfigured, configProblem } from "./supabaseClient.js";
import SetupMessage from "./components/SetupMessage.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import App from "./App.jsx";

function AuthGate() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setNotice("Could not check your login. Please log in again.");
        setSession(data?.session ?? null);
      })
      .catch(() => {
        if (!active) return;
        setNotice("Could not reach Supabase to check your login.");
        setSession(null);
      });
    // Fires on login, logout and token refresh (a failed refresh signs the user out).
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      if (s) setNotice("");
      setSession(s);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: "local" }); // still log out on this device
  }

  function sessionExpired() {
    setNotice("Your session has expired. Please log in again.");
    supabase.auth.signOut({ scope: "local" });
  }

  if (session === undefined) return <p className="center-msg" role="status">Checking your login…</p>;
  if (!session) return <AuthScreen notice={notice} />;
  // key = user id, so data from one account is never reused for another.
  return <App key={session.user.id} user={session.user} onSignOut={signOut} onSessionExpired={sessionExpired} />;
}

export default function Root() {
  return isConfigured ? <AuthGate /> : <SetupMessage problem={configProblem} />;
}

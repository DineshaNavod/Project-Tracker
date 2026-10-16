// Checks the two browser-safe Supabase settings. Pure, so it is easy to test.
function looksLikeServiceRoleJwt(key) {
  try {
    const part = key.split(".")[1];
    if (!part) return false;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json).role === "service_role";
  } catch {
    return false;
  }
}

export function checkConfig(url, key) {
  const u = (url ?? "").trim();
  const k = (key ?? "").trim();
  if (!u || !k) return { ok: false, problem: "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set." };
  if (/your-/i.test(u) || /your-/i.test(k)) return { ok: false, problem: "The .env.local values are still the placeholders from .env.example." };
  try {
    const p = new URL(u);
    if (p.protocol !== "https:" && p.protocol !== "http:") throw new Error();
  } catch {
    return { ok: false, problem: "VITE_SUPABASE_URL is not a valid URL (it should look like https://xxxx.supabase.co)." };
  }
  if (k.startsWith("sb_secret_") || looksLikeServiceRoleJwt(k)) {
    return { ok: false, problem: "A secret / service_role key was provided. Never use it in a browser app. Use the publishable key instead." };
  }
  return { ok: true, problem: "" };
}

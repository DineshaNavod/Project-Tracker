import { createClient } from "@supabase/supabase-js";
import { checkConfig } from "./db/config.js";

// Only the project URL and the publishable key belong in the browser. Never a secret key.
const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
const result = checkConfig(url, key);

export const isConfigured = result.ok;
export const configProblem = result.problem;
export const supabase = result.ok ? createClient(url.trim(), key.trim()) : null;

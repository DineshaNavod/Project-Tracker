import { supabase } from "../supabaseClient.js";
import { createApi } from "./api.js";

// null when Supabase is not configured (the app shows a setup message instead).
export const api = supabase ? createApi(supabase) : null;

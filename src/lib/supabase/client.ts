import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

function getRequiredPublicEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function createBrowserSupabaseClient() {
  return createClient<Database>(
    getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

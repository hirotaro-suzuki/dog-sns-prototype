import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

function getRequiredServerEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function createServerSupabaseClient() {
  return createClient<Database>(
    getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

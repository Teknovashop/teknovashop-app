import { createClient } from "@supabase/supabase-js";

// Server-only admin client. The database schema is created by SQL migrations and
// is not generated into TypeScript yet, so keep this client intentionally
// untyped until we add generated Supabase Database types.
let admin: any = null;

export function getSupabaseAdmin(): any {
  if (admin) return admin;

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceRole) {
    throw new Error(
      "Supabase server configuration missing: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  admin = createClient<any>(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return admin;
}

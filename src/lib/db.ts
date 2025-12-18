import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn("Supabase environment variables are missing.");
}

export const supabaseAdmin = createClient<Database>(
  supabaseUrl ?? "",
  supabaseServiceRoleKey ?? "",
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

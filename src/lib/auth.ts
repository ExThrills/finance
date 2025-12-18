import { supabaseAdmin } from "@/lib/db";

export async function getCurrentUser() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("No users found. Run the seed script first.");
  }

  return data;
}

export async function getCurrentUserId() {
  const user = await getCurrentUser();
  return user.id;
}

import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/db";

const authHeaderName = "authorization";

async function ensureProfile(user: User) {
  if (!user.email) {
    throw new Error("Authenticated user is missing an email.");
  }

  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (data?.id) {
    return;
  }

  const { error } = await supabaseAdmin.from("users").insert({
    id: user.id,
    email: user.email,
    password_hash: "supabase",
  });

  if (error) {
    throw error;
  }
}

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
  const authHeader = (await headers()).get(authHeaderName) ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      throw error ?? new Error("Unauthorized.");
    }
    await ensureProfile(data.user);
    return data.user.id;
  }

  const user = await getCurrentUser();
  return user.id;
}

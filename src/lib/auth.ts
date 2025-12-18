import { prisma } from "@/lib/db";

export async function getCurrentUser() {
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No users found. Run the seed script first.");
  }
  return user;
}

export async function getCurrentUserId() {
  const user = await getCurrentUser();
  return user.id;
}

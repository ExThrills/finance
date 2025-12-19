import { supabaseAdmin } from "@/lib/db";
import type { Json } from "@/types/database";

export async function logAuditEvent(params: {
  userId: string;
  actorId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const { userId, actorId, entityType, entityId, action, metadata } = params;
  const { error } = await supabaseAdmin.from("audit_events").insert({
    user_id: userId,
    actor_id: actorId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    metadata: (metadata ?? null) as Json,
  });
  if (error) {
    console.warn("Failed to write audit event", error);
  }
}

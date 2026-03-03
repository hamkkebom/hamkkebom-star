import { prisma } from "@/lib/prisma";

interface CreateAuditLogParams {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, { from?: unknown; to?: unknown }> | null;
  metadata?: Record<string, unknown> | null;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: params.changes ?? undefined,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch (error) {
    // Fire-and-forget: audit failures must never block the parent request
    console.error("[AuditLog] Failed to create audit log:", error);
  }
}

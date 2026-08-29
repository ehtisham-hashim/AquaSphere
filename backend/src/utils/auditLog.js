import { prisma } from '../config/db.js';

export async function createAuditLog(prefix, { action, entityType, entityId, performedBy, details }) {
  try {
    return await prisma[`${prefix}AuditLog`].create({
      data: {
        action,
        entityType,
        entityId,
        performedBy: performedBy || 'System',
        details: typeof details === 'object' ? JSON.stringify(details) : details || ''
      }
    });
  } catch (err) {
    console.error(`Failed to record audit log for ${prefix}:`, err.message);
  }
}

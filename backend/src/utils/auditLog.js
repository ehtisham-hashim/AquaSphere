import { prisma } from '../config/db.js';

/**
 * Persists an administrative or transactional audit trail record for a given tenant.
 *
 * @param {'aquasphere' | 'wadaana'} prefix - Tenant schema prefix.
 * @param {object} logData - Audit event payload.
 * @param {string} logData.action - Action identifier (e.g. 'CUSTOMER_CREATED').
 * @param {string} logData.entityType - Target model/entity type.
 * @param {string} logData.entityId - Primary key ID of the impacted entity.
 * @param {string} [logData.performedBy='System'] - User identifier or name who performed the action.
 * @param {string|object} [logData.details=''] - Contextual metadata or change diffs.
 * @returns {Promise<object|void>} Created audit log record or undefined on error.
 */
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

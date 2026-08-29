import { prisma } from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';

const getPrefix = getTenantPrefix;

/**
 * Retrieves the latest 50 tracked audit logs enriched with user names and human-readable roles.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const prefix = getPrefix(req);
  
  const auditLogsModel = prisma[`${prefix}AuditLog`];
  const trackedActions = [
    'CUSTOMER_ADDED', 
    'CUSTOMER_CREATED', 
    'CUSTOMER_DELETED', 
    'ORDER_CREATED', 
    'ORDER_DELIVERED', 
    'ORDER_PAYMENT_SETTLED', 
    'PRODUCTION_BATCH_CREATED', 
    'PRODUCTION_BATCH_COMPLETED'
  ];
  
  const logs = await auditLogsModel.findMany({
    where: { action: { in: trackedActions } },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  // Extract unique user IDs and lookup human user names
  const userIds = [...new Set(logs.map(l => l.performedBy).filter(Boolean))];
  let userMap = {};

  if (userIds.length > 0) {
    try {
      const users = await prisma[`${prefix}User`].findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, role: true }
      });
      users.forEach(u => {
        userMap[u.id] = `${u.name} (${u.role.replace('_', ' ')})`;
      });
    } catch (err) {
      console.error('Error fetching user names for audit logs:', err);
    }
  }

  const formattedLogs = logs.map(l => ({
    ...l,
    performedBy: userMap[l.performedBy] || l.performedBy || 'System'
  }));

  res.status(200).json(new ApiResponse(200, formattedLogs, 'Audit logs retrieved'));
});

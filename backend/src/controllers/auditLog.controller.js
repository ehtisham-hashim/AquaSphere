import { prisma } from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getPrefix = (req) => (req.headers['x-tenant'] || 'aquasphere').toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const prefix = getPrefix(req);
  
  const auditLogsModel = prisma[`${prefix}AuditLog`];
  
  const logs = await auditLogsModel.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  res.status(200).json(new ApiResponse(200, logs, 'Audit logs retrieved'));
});

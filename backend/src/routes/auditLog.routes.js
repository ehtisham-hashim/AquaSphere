import express from 'express';
import { getAuditLogs } from '../controllers/auditLog.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { ApiError } from '../utils/ApiError.js';

const router = express.Router();

router.use(verifyJWT);
router.use((req, res, next) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Unauthorized');
  }
  next();
});

router.get('/', getAuditLogs);

export default router;

import express from 'express';
import { getReportData } from '../controllers/reports.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { ApiError } from '../utils/ApiError.js';

const router = express.Router();

router.use(verifyJWT);
router.use((req, res, next) => {
  const allowed = ['OWNER', 'ACCOUNTANT', 'ADMIN'];
  if (!allowed.includes(req.user.role)) {
    throw new ApiError(403, 'Unauthorized to view reports');
  }
  next();
});

router.get('/:reportType', getReportData);

export default router;

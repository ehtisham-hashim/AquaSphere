import { Router } from 'express';
import { getDashboardAnalytics, streamDashboardAnalytics } from '../controllers/analytics.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT);
router.get('/dashboard', getDashboardAnalytics);
router.get('/dashboard/stream', streamDashboardAnalytics);

export default router;

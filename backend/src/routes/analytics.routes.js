import { Router } from 'express';
import { getDashboardAnalytics, streamDashboardAnalytics, getPurchasingSummary } from '../controllers/analytics.controller.js';
import { getMMAlerts } from '../controllers/alerts.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT);
router.get('/dashboard', getDashboardAnalytics);
router.get('/dashboard/stream', streamDashboardAnalytics);
router.get('/purchasing-summary', getPurchasingSummary);
router.get('/mm-alerts', getMMAlerts);

export default router;

import { Router } from 'express';
import { getDashboardAnalytics, streamDashboardAnalytics, getPurchasingSummary, getProductionDashboard, getDailySummary, getBottleCustody, getProductionLoss } from '../controllers/analytics.controller.js';
import { getMMAlerts } from '../controllers/alerts.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = Router();

router.use(verifyJWT);
router.get('/dashboard', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getDashboardAnalytics);
router.get('/dashboard/stream', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), streamDashboardAnalytics);
router.get('/purchasing-summary', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT'), getPurchasingSummary);
router.get('/daily-summary', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT'), getDailySummary);
router.get('/production-dashboard', requireRoles('OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'ACCOUNTANT'), getProductionDashboard);
router.get('/production-loss', requireRoles('OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'ACCOUNTANT'), getProductionLoss);
router.get('/bottle-custody', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getBottleCustody);
router.get('/mm-alerts', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getMMAlerts);

export default router;

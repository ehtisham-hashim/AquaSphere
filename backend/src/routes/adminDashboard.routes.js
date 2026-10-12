import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getAdminDashboard, getAdminCashSummary, getCustomerAlerts, getNotificationAlerts } from '../controllers/adminDashboard.controller.js';

const router = Router();

// All admin routes require authentication
router.use(verifyJWT);

// Middleware: restrict to ADMIN and OWNER only
const adminOnly = (req, res, next) => {
  if (!['ADMIN', 'OWNER', 'MARKETING_MANAGER'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }
  next();
};

router.use(adminOnly);

// Feature 2: View-Only Dashboard (stock, production, orders — no profit)
router.get('/dashboard', getAdminDashboard);

// Feature 4: Cash Summary (no profit detail)
router.get('/cash-summary', getAdminCashSummary);

// Feature 5: Customer Alert Monitoring (read-only)
router.get('/customer-alerts', getCustomerAlerts);

// Feature 6: Notification Bar Alerts (Customer create, Stock low, Unpaid, Inactive)
router.get('/notification-alerts', getNotificationAlerts);

export default router;

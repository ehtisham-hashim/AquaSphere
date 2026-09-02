import express from 'express';
import { closeDay, getDailyCloseStatus, getDailyCloseHistory, reopenDay, pmConfirmDailyClose, mmConfirmDailyClose } from '../controllers/dailyClose.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

import { requireRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

router.use(verifyJWT);

// View status and history: All authenticated management roles
router.get('/status', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'), getDailyCloseStatus);
router.get('/history', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'), getDailyCloseHistory);

// Confirmation & Final Close: Restricted to authorized operating roles
router.post('/pm-confirm', requireRoles('OWNER', 'PRODUCTION_MANAGER'), pmConfirmDailyClose);
router.post('/mm-confirm', requireRoles('OWNER', 'MARKETING_MANAGER'), mmConfirmDailyClose);
router.post('/', requireRoles('OWNER', 'ACCOUNTANT'), closeDay);

// Reopen: Strictly OWNER only
router.post('/reopen', requireRoles('OWNER'), reopenDay);

export default router;

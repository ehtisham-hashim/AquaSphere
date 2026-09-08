import express from 'express';
import { closeDay, getDailyCloseStatus, getDailyCloseHistory, reopenDay, pmConfirmDailyClose, mmConfirmDailyClose, tmConfirmDailyClose } from '../controllers/dailyClose.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

import { requireRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

router.use(verifyJWT);

// View status and history: All authenticated management roles
router.get('/status', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER', 'TRANSPORT_MANAGER'), getDailyCloseStatus);
router.get('/history', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER', 'TRANSPORT_MANAGER'), getDailyCloseHistory);

// Confirmation & Final Close: Restricted to authorized operating roles
router.post('/pm-confirm', requireRoles('OWNER', 'ADMIN', 'PRODUCTION_MANAGER'), pmConfirmDailyClose);
router.post('/mm-confirm', requireRoles('OWNER', 'ADMIN', 'MARKETING_MANAGER'), mmConfirmDailyClose);
router.post('/tm-confirm', requireRoles('OWNER', 'ADMIN', 'TRANSPORT_MANAGER'), tmConfirmDailyClose);
router.post('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT'), closeDay);

// Reopen: Strictly OWNER only
router.post('/reopen', requireRoles('OWNER'), reopenDay);

export default router;

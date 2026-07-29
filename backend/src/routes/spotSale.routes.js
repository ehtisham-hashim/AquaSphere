import express from 'express';
import { getSpotSales, createSpotSale } from '../controllers/spotSale.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js';

const router = express.Router();

router.use(verifyJWT);

// GET spot sales history & reports: OWNER, ADMIN, ACCOUNTANT, MARKETING_MANAGER, PRODUCTION_MANAGER
router.get('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER', 'PRODUCTION_MANAGER'), getSpotSales);

// POST new spot/counter sale: OWNER, ACCOUNTANT, MARKETING_MANAGER
router.post('/', requireRoles('OWNER', 'ACCOUNTANT', 'MARKETING_MANAGER'), checkDailyCloseLock, createSpotSale);

export default router;

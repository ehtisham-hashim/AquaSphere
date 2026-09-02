import express from 'express';
import { getSpotSales, createSpotSale, updateSpotSale, deleteSpotSale } from '../controllers/spotSale.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js';

const router = express.Router();

router.use(verifyJWT);

// GET spot sales history & reports: OWNER, ADMIN, ACCOUNTANT, MARKETING_MANAGER
router.get('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getSpotSales);

// POST new spot/counter sale: OWNER, ACCOUNTANT, MARKETING_MANAGER, ADMIN
router.post('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), checkDailyCloseLock, createSpotSale);

// PUT update spot/counter sale (remarks, payment method before Daily Close)
router.put('/:id', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), updateSpotSale);

// DELETE spot/counter sale: OWNER only
router.delete('/:id', requireRoles('OWNER'), deleteSpotSale);

export default router;

import express from 'express';
import { getSpotSales, createSpotSale } from '../controllers/spotSale.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js';

const router = express.Router();

router.use(verifyJWT);
router.get('/', getSpotSales);
router.post('/', checkDailyCloseLock, createSpotSale);

export default router;

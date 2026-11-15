import express from 'express';
import {
  getBottleSummary,
  getBottleTransactions,
  createBottleTransaction
} from '../controllers/bottle.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js';

const router = express.Router();

router.use(verifyJWT);

const READ_ROLES = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER', 'PRODUCTION_MANAGER', 'TRANSPORT_MANAGER'];
const WRITE_ROLES = ['OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'];

router.get('/summary', requireRoles(...READ_ROLES), getBottleSummary);
router.get('/transactions', requireRoles(...READ_ROLES), getBottleTransactions);
router.post('/transactions', requireRoles(...WRITE_ROLES), checkDailyCloseLock, createBottleTransaction);

export default router;

import express from 'express';
import {
  getBottleSummary,
  getBottleTransactions,
  createBottleTransaction
} from '../controllers/bottle.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

router.use(verifyJWT);

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER', 'PRODUCTION_MANAGER', 'TRANSPORT_MANAGER'];

router.get('/summary', requireRoles(...ALLOWED_ROLES), getBottleSummary);
router.get('/transactions', requireRoles(...ALLOWED_ROLES), getBottleTransactions);
router.post('/transactions', requireRoles(...ALLOWED_ROLES), createBottleTransaction);

export default router;

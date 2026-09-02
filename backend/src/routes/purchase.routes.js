import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  uploadReceipt,
  approvePurchase,
  deletePurchase,
  updatePurchaseStatus
} from '../controllers/purchase.controller.js';

const router = Router();

router.use(verifyJWT);

// GET routes: OWNER, PRODUCTION_MANAGER, ACCOUNTANT, ADMIN
router.get('/', requireRoles('OWNER', 'PRODUCTION_MANAGER', 'ACCOUNTANT', 'ADMIN'), getPurchases);
router.get('/:id', requireRoles('OWNER', 'PRODUCTION_MANAGER', 'ACCOUNTANT', 'ADMIN'), getPurchaseById);

// POST routes: Only OWNER and PRODUCTION_MANAGER can record purchases and upload receipts
router.post('/', requireRoles('OWNER', 'PRODUCTION_MANAGER'), checkDailyCloseLock, createPurchase);
router.post('/upload-receipt', requireRoles('OWNER', 'PRODUCTION_MANAGER'), upload.single('receipt'), uploadReceipt);
router.patch('/:id/status', requireRoles('OWNER', 'PRODUCTION_MANAGER', 'ACCOUNTANT'), updatePurchaseStatus);

// APPROVE route: ACCOUNTANT and OWNER can verify bills
router.post('/:id/approve', requireRoles('OWNER', 'ACCOUNTANT'), approvePurchase);

// DELETE route: Strictly OWNER can delete purchases and reverse stock/ledger
router.delete('/:id', requireRoles('OWNER'), checkDailyCloseLock, deletePurchase);

export default router;

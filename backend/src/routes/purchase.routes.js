import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  uploadReceipt
} from '../controllers/purchase.controller.js';

const router = Router();

router.use(verifyJWT);
router.use(requireRoles('OWNER', 'ACCOUNTANT'));

router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', checkDailyCloseLock, createPurchase);

// Dedicated receipt upload endpoint — returns { receiptUrl } for frontend to use
router.post('/upload-receipt', upload.single('receipt'), uploadReceipt);

export default router;

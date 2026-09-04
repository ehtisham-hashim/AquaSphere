import { Router } from 'express';
import { getExpenses, createExpense, uploadExpenseReceipt } from '../controllers/expense.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js';
import upload from '../middlewares/upload.middleware.js';

const router = Router();
router.use(verifyJWT);

// View Expenses: OWNER, ADMIN, ACCOUNTANT
router.get('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT'), getExpenses);

// Write Expenses: OWNER, ACCOUNTANT (Admin is read-only)
router.post('/', requireRoles('OWNER', 'ACCOUNTANT'), checkDailyCloseLock, createExpense);
router.post('/upload-receipt', requireRoles('OWNER', 'ACCOUNTANT'), upload.single('receipt'), uploadExpenseReceipt);

export default router;

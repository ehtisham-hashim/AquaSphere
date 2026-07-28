import { Router } from 'express';
import { getExpenses, createExpense, uploadExpenseReceipt } from '../controllers/expense.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js';
import upload from '../middlewares/upload.middleware.js';

const router = Router();
router.use(verifyJWT);
router.get('/', getExpenses);
router.post('/', checkDailyCloseLock, createExpense);
router.post('/upload-receipt', upload.single('receipt'), uploadExpenseReceipt);

export default router;

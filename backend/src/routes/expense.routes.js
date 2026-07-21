import { Router } from 'express';
import { getExpenses, createExpense } from '../controllers/expense.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);
router.get('/', getExpenses);
router.post('/', createExpense);

export default router;

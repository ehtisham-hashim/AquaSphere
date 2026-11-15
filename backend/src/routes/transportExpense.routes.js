import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js';
import { getTransportExpenses, getExpensesByVehicle, addTransportExpense, deleteTransportExpense } from '../controllers/transportExpense.controller.js';

const router = Router();
router.use(verifyJWT);

router.get('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'TRANSPORT_MANAGER'), getTransportExpenses);
router.get('/vehicle/:id', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'TRANSPORT_MANAGER'), getExpensesByVehicle);
router.post('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'TRANSPORT_MANAGER'), checkDailyCloseLock, addTransportExpense);
router.delete('/:id', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'TRANSPORT_MANAGER'), checkDailyCloseLock, deleteTransportExpense);

export default router;

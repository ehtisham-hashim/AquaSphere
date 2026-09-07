import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { getTransportExpenses, getExpensesByVehicle, addTransportExpense, deleteTransportExpense } from '../controllers/transportExpense.controller.js';

const router = Router();
router.use(verifyJWT);

router.get('/', requireRoles('OWNER', 'TRANSPORT_MANAGER'), getTransportExpenses);
router.get('/vehicle/:id', requireRoles('OWNER', 'TRANSPORT_MANAGER'), getExpensesByVehicle);
router.post('/', requireRoles('TRANSPORT_MANAGER'), addTransportExpense);
router.delete('/:id', requireRoles('TRANSPORT_MANAGER'), deleteTransportExpense);

export default router;

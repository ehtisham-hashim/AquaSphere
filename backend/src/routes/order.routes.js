import { Router } from 'express';
import { getOrders, createOrder, updateOrder, deliverOrder, recordOrderPayment, getOrderPDF, deleteOrder } from '../controllers/order.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { checkDailyCloseLock } from '../middlewares/dailyClose.middleware.js';

const router = Router();
router.use(verifyJWT);

// View Orders: OWNER, ADMIN, ACCOUNTANT, MARKETING_MANAGER, TRANSPORT_MANAGER
router.get('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER', 'TRANSPORT_MANAGER'), getOrders);
router.get('/:id/pdf', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER', 'TRANSPORT_MANAGER'), getOrderPDF);

// Write Orders: OWNER, ADMIN, ACCOUNTANT, MARKETING_MANAGER
router.post('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), checkDailyCloseLock, createOrder);
router.put('/:id', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), checkDailyCloseLock, updateOrder);
router.post('/:id/deliver', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), checkDailyCloseLock, deliverOrder);
router.post('/:id/payment', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), checkDailyCloseLock, recordOrderPayment);
router.delete('/:id', requireRoles('OWNER', 'MARKETING_MANAGER'), checkDailyCloseLock, deleteOrder);

export default router;

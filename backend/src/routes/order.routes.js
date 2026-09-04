import { Router } from 'express';
import { getOrders, createOrder, updateOrder, deliverOrder, getOrderPDF, deleteOrder } from '../controllers/order.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = Router();
router.use(verifyJWT);

// View Orders: OWNER, ADMIN, ACCOUNTANT, MARKETING_MANAGER
router.get('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getOrders);
router.get('/:id/pdf', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getOrderPDF);

// Write Orders: OWNER, ACCOUNTANT, MARKETING_MANAGER (Admin is read-only)
router.post('/', requireRoles('OWNER', 'ACCOUNTANT', 'MARKETING_MANAGER'), createOrder);
router.put('/:id', requireRoles('OWNER', 'ACCOUNTANT', 'MARKETING_MANAGER'), updateOrder);
router.post('/:id/deliver', requireRoles('OWNER', 'ACCOUNTANT', 'MARKETING_MANAGER'), deliverOrder);
router.delete('/:id', requireRoles('OWNER'), deleteOrder);

export default router;

import { Router } from 'express';
import { getOrders, createOrder, updateOrder, deliverOrder, getOrderPDF } from '../controllers/order.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);
router.get('/', getOrders);
router.post('/', createOrder);
router.put('/:id', updateOrder);
router.post('/:id/deliver', deliverOrder);
router.get('/:id/pdf', getOrderPDF);

export default router;

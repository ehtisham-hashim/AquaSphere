import { Router } from 'express';
import { getCustomers, createCustomer } from '../controllers/customer.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);
router.get('/', getCustomers);
router.post('/', createCustomer);

export default router;

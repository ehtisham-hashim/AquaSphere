import { Router } from 'express';
import { getCustomers, createCustomer, deleteCustomer } from '../controllers/customer.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);
router.get('/', getCustomers);
router.post('/', createCustomer);
router.delete('/:id', deleteCustomer);

export default router;


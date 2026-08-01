import { Router } from 'express';
import { getCustomers, getCustomerDetails, createCustomer, updateCustomer, deleteCustomer, restoreCustomer, uploadCustomerPicture } from '../controllers/customer.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.middleware.js';

const router = Router();
router.use(verifyJWT);
router.get('/', getCustomers);
router.get('/:id', getCustomerDetails);
router.post('/', createCustomer);
router.post('/upload-picture', upload.single('image'), uploadCustomerPicture);
router.put('/:id', updateCustomer);
router.patch('/:id/restore', restoreCustomer);
router.delete('/:id', deleteCustomer);

export default router;

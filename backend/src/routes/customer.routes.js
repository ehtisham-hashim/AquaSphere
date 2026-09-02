import { Router } from 'express';
import { getCustomers, getCustomerDetails, createCustomer, updateCustomer, deleteCustomer, restoreCustomer, uploadCustomerPicture } from '../controllers/customer.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import upload from '../middlewares/upload.middleware.js';

const router = Router();
router.use(verifyJWT);

// Customer view access: OWNER, ADMIN, ACCOUNTANT, MARKETING_MANAGER (PM is strictly excluded)
router.get('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getCustomers);
router.get('/:id', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), getCustomerDetails);

// Add / Edit customers: OWNER, MARKETING_MANAGER (Admin is view-only)
router.post('/', requireRoles('OWNER', 'MARKETING_MANAGER'), createCustomer);
router.post('/upload-picture', requireRoles('OWNER', 'MARKETING_MANAGER'), upload.single('image'), uploadCustomerPicture);
router.put('/:id', requireRoles('OWNER', 'MARKETING_MANAGER'), updateCustomer);
router.patch('/:id/restore', requireRoles('OWNER'), restoreCustomer);

// Delete customer: strictly OWNER only (anti-corruption feature)
router.delete('/:id', requireRoles('OWNER'), deleteCustomer);

export default router;

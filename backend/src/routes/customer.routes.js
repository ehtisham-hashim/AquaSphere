import { Router } from 'express';
import { 
  getCustomers, 
  getCustomerDetails, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer, 
  restoreCustomer, 
  uploadCustomerPicture, 
  settleCustomerLumpSumPayment,
  getMarketers,
  createMarketer
} from '../controllers/customer.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import upload from '../middlewares/upload.middleware.js';

const router = Router();
router.use(verifyJWT);

// Marketer Registry routes (MUST be placed before /:id)
router.get('/marketers', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER', 'TRANSPORT_MANAGER'), getMarketers);
router.post('/marketers', requireRoles('OWNER', 'MARKETING_MANAGER', 'ADMIN'), createMarketer);

// Customer view access: OWNER, ADMIN, ACCOUNTANT, MARKETING_MANAGER, TRANSPORT_MANAGER
router.get('/', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER', 'TRANSPORT_MANAGER'), getCustomers);
router.get('/:id', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER', 'TRANSPORT_MANAGER'), getCustomerDetails);

// Add / Edit customers: OWNER, MARKETING_MANAGER, ADMIN
router.post('/', requireRoles('OWNER', 'MARKETING_MANAGER', 'ADMIN'), createCustomer);
router.post('/upload-picture', requireRoles('OWNER', 'MARKETING_MANAGER', 'ADMIN'), upload.single('image'), uploadCustomerPicture);
router.post('/:id/payment', requireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MARKETING_MANAGER'), settleCustomerLumpSumPayment);
router.put('/:id', requireRoles('OWNER', 'MARKETING_MANAGER', 'ADMIN'), updateCustomer);
router.patch('/:id/restore', requireRoles('OWNER'), restoreCustomer);

// Delete customer: strictly OWNER only (anti-corruption feature)
router.delete('/:id', requireRoles('OWNER'), deleteCustomer);

export default router;

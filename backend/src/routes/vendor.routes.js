import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  archiveVendor,
  restoreVendor,
  recordVendorPayment,
  uploadPaymentProof
} from '../controllers/vendor.controller.js';

const router = Router();

router.use(verifyJWT);

// View Vendors & Vendor Profiles: OWNER, ACCOUNTANT, ADMIN, PRODUCTION_MANAGER, MARKETING_MANAGER
router.get('/', requireRoles('OWNER', 'ACCOUNTANT', 'ADMIN', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'), getVendors);
router.get('/:id', requireRoles('OWNER', 'ACCOUNTANT', 'ADMIN', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'), getVendorById);

// Create & Edit Vendors: OWNER, ACCOUNTANT, ADMIN, PRODUCTION_MANAGER
router.post('/', requireRoles('OWNER', 'ACCOUNTANT', 'ADMIN', 'PRODUCTION_MANAGER'), createVendor);
router.put('/:id', requireRoles('OWNER', 'ACCOUNTANT', 'ADMIN', 'PRODUCTION_MANAGER'), updateVendor);

// Record Payment & Archive/Restore: OWNER, ACCOUNTANT, ADMIN
router.post('/upload-payment-proof', requireRoles('OWNER', 'ACCOUNTANT', 'ADMIN'), upload.single('image'), uploadPaymentProof);
router.post('/:id/payments', requireRoles('OWNER', 'ACCOUNTANT', 'ADMIN'), recordVendorPayment);
router.patch('/:id/archive', requireRoles('OWNER', 'ACCOUNTANT', 'ADMIN'), archiveVendor);
router.patch('/:id/restore', requireRoles('OWNER', 'ACCOUNTANT', 'ADMIN'), restoreVendor);

export default router;

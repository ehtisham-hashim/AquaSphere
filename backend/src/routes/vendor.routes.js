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

// View Vendors & Vendor Profiles: OWNER, ACCOUNTANT, ADMIN
router.get('/', requireRoles('OWNER', 'ACCOUNTANT', 'ADMIN'), getVendors);
router.get('/:id', requireRoles('OWNER', 'ACCOUNTANT', 'ADMIN'), getVendorById);

// Create & Edit Vendors: OWNER, ACCOUNTANT (Admin is read-only)
router.post('/', requireRoles('OWNER', 'ACCOUNTANT'), createVendor);
router.put('/:id', requireRoles('OWNER', 'ACCOUNTANT'), updateVendor);

// Record Payment & Archive/Restore: OWNER, ACCOUNTANT
router.post('/upload-payment-proof', requireRoles('OWNER', 'ACCOUNTANT'), upload.single('image'), uploadPaymentProof);
router.post('/:id/payments', requireRoles('OWNER', 'ACCOUNTANT'), recordVendorPayment);
router.patch('/:id/archive', requireRoles('OWNER', 'ACCOUNTANT'), archiveVendor);
router.patch('/:id/restore', requireRoles('OWNER', 'ACCOUNTANT'), restoreVendor);

export default router;

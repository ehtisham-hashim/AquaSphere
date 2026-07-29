import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  archiveVendor,
  restoreVendor,
  recordVendorPayment
} from '../controllers/vendor.controller.js';

const router = Router();

router.use(verifyJWT);

// View Vendors & Vendor Profiles: OWNER, ACCOUNTANT, PRODUCTION_MANAGER, MARKETING_MANAGER
router.get('/', requireRoles('OWNER', 'ACCOUNTANT', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'), getVendors);
router.get('/:id', requireRoles('OWNER', 'ACCOUNTANT', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER'), getVendorById);

// Create & Edit Vendors: OWNER, ACCOUNTANT, PRODUCTION_MANAGER
router.post('/', requireRoles('OWNER', 'ACCOUNTANT', 'PRODUCTION_MANAGER'), createVendor);
router.put('/:id', requireRoles('OWNER', 'ACCOUNTANT', 'PRODUCTION_MANAGER'), updateVendor);

// Record Payment & Archive/Restore: OWNER, ACCOUNTANT
router.post('/:id/payments', requireRoles('OWNER', 'ACCOUNTANT'), recordVendorPayment);
router.patch('/:id/archive', requireRoles('OWNER', 'ACCOUNTANT'), archiveVendor);
router.patch('/:id/restore', requireRoles('OWNER', 'ACCOUNTANT'), restoreVendor);

export default router;

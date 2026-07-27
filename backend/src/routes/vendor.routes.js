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
router.use(requireRoles('OWNER', 'ACCOUNTANT'));

router.get('/', getVendors);
router.get('/:id', getVendorById);
router.post('/', createVendor);
router.post('/:id/payments', recordVendorPayment);
router.put('/:id', updateVendor);
router.patch('/:id/archive', archiveVendor);
router.patch('/:id/restore', restoreVendor);

export default router;


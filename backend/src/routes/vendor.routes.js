import { Router } from 'express';
import { getVendors, createVendor, createPurchase } from '../controllers/vendor.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT);

router.get('/', getVendors);
router.post('/', createVendor);
router.post('/purchases', createPurchase);

export default router;

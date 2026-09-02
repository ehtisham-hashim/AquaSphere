import { Router } from 'express';
import { createProductionBatch, completeProductionBatch, getProductionBatches, getProductionStats, deleteProductionBatch } from '../controllers/production.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = Router();
router.use(verifyJWT);

// View Production: OWNER, ADMIN, PRODUCTION_MANAGER
router.get('/', requireRoles('OWNER', 'ADMIN', 'PRODUCTION_MANAGER'), getProductionBatches);
router.get('/stats', requireRoles('OWNER', 'ADMIN', 'PRODUCTION_MANAGER'), getProductionStats);

// Write Production: OWNER, PRODUCTION_MANAGER (Admin is read-only)
router.post('/', requireRoles('OWNER', 'PRODUCTION_MANAGER'), createProductionBatch);
router.post('/:id/complete', requireRoles('OWNER', 'PRODUCTION_MANAGER'), completeProductionBatch);
router.delete('/:id', requireRoles('OWNER'), deleteProductionBatch);

export default router;

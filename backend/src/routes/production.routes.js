import { Router } from 'express';
import { createProductionBatch, completeProductionBatch, getProductionBatches, getProductionStats, deleteProductionBatch } from '../controllers/production.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);
router.get('/', getProductionBatches);
router.get('/stats', getProductionStats);
router.post('/', createProductionBatch);
router.post('/:id/complete', completeProductionBatch);
router.delete('/:id', deleteProductionBatch);

export default router;

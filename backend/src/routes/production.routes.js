import { Router } from 'express';
import { createProductionBatch, getProductionBatches, getProductionStats } from '../controllers/production.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);
router.get('/', getProductionBatches);
router.get('/stats', getProductionStats);
router.post('/', createProductionBatch);

export default router;

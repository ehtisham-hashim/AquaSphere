import { Router } from 'express';
import { createProductionBatch, getProductionBatches } from '../controllers/production.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);
router.get('/', getProductionBatches);
router.post('/', createProductionBatch);

export default router;

import { Router } from 'express';
import { createProductionBatch } from '../controllers/production.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);
router.post('/', createProductionBatch);

export default router;

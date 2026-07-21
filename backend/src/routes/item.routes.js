import { Router } from 'express';
import { getItems } from '../controllers/item.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);
router.get('/', getItems);

export default router;

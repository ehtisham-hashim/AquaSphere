import { Router } from 'express';
import { login, logout, getMe } from '../controllers/auth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyJWT, getMe);

export default router;

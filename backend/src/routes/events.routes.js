import { Router } from 'express';
import { streamEvents } from '../utils/sseBus.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJWT);

// Stream SSE events for tenant
router.get('/stream', streamEvents);
router.get('/', streamEvents);

export default router;

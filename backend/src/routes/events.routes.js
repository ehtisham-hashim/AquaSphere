import { Router } from 'express';
import { streamEvents } from '../utils/sseBus.js';

const router = Router();

// Stream SSE events for tenant
router.get('/stream', streamEvents);
router.get('/', streamEvents);

export default router;

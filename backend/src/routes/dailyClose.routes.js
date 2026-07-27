import express from 'express';
import { closeDay, getDailyCloseStatus, getDailyCloseHistory, reopenDay } from '../controllers/dailyClose.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(verifyJWT);

router.post('/', closeDay);
router.get('/status', getDailyCloseStatus);
router.get('/history', getDailyCloseHistory);
router.post('/reopen', reopenDay);

export default router;

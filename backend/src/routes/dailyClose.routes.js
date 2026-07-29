import express from 'express';
import { closeDay, getDailyCloseStatus, getDailyCloseHistory, reopenDay, pmConfirmDailyClose } from '../controllers/dailyClose.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(verifyJWT);

router.post('/', closeDay);
router.post('/pm-confirm', pmConfirmDailyClose);
router.get('/status', getDailyCloseStatus);
router.get('/history', getDailyCloseHistory);
router.post('/reopen', reopenDay);

export default router;

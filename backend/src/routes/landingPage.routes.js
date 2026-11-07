import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getLandingPageSettings,
  updateLandingPageSettings,
  getLandingPageAssets,
  submitContactInquiry,
  getContactInquiries
} from '../controllers/landingPage.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many contact inquiries from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.get('/', getLandingPageSettings);
router.put('/', verifyJWT, updateLandingPageSettings);
router.get('/assets', verifyJWT, getLandingPageAssets);
router.post('/contact', contactLimiter, submitContactInquiry);
router.get('/contact-inquiries', verifyJWT, getContactInquiries);

export default router;

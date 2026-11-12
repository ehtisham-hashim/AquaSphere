import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, getMe, verifyOwnerOtp, resendOwnerOtp } from '../controllers/auth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many failed authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const otpResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP resend requests. Please wait before requesting another code.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', authLimiter, login);
router.post('/verify-owner-otp', authLimiter, verifyOwnerOtp);
router.post('/resend-owner-otp', otpResendLimiter, resendOwnerOtp);
router.post('/logout', logout);
router.get('/me', verifyJWT, getMe);

export default router;

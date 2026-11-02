import express from 'express';
import {
  getLandingPageSettings,
  updateLandingPageSettings,
  getLandingPageAssets,
  submitContactInquiry,
  getContactInquiries
} from '../controllers/landingPage.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getLandingPageSettings);
router.put('/', verifyJWT, updateLandingPageSettings);
router.get('/assets', verifyJWT, getLandingPageAssets);
router.post('/contact', submitContactInquiry);
router.get('/contact-inquiries', verifyJWT, getContactInquiries);

export default router;

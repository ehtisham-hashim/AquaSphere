import express from 'express';
import {
  getLandingPageSettings,
  updateLandingPageSettings,
  getLandingPageAssets
} from '../controllers/landingPage.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getLandingPageSettings);
router.put('/', verifyJWT, updateLandingPageSettings);
router.get('/assets', verifyJWT, getLandingPageAssets);

export default router;

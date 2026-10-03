import express from 'express';
import {
  getLandingPageSettings,
  updateLandingPageSettings,
  getLandingPageAssets
} from '../controllers/landingPage.controller.js';

const router = express.Router();

router.get('/', getLandingPageSettings);
router.put('/', updateLandingPageSettings);
router.get('/assets', getLandingPageAssets);

export default router;

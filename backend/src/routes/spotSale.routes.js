import express from 'express';
import { getSpotSales, createSpotSale } from '../controllers/spotSale.controller.js';

const router = express.Router();

router.get('/', getSpotSales);
router.post('/', createSpotSale);

export default router;

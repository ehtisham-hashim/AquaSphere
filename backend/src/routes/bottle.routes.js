import express from 'express';
import {
  getBottleSummary,
  getBottleTransactions,
  createBottleTransaction
} from '../controllers/bottle.controller.js';

const router = express.Router();

router.get('/summary', getBottleSummary);
router.get('/transactions', getBottleTransactions);
router.post('/transactions', createBottleTransaction);

export default router;

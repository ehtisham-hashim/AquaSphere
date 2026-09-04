import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  archiveItem,
  restoreItem,
  adjustInventory,
  getInventoryTransactions,
  transferStock,
  reconcileInventory
} from '../controllers/item.controller.js';

const router = Router();

router.use(verifyJWT);

// GET is accessible to all authenticated roles
router.get('/transactions', getInventoryTransactions);
router.get('/', getItems);
router.get('/:id', getItemById);

// Adding & updating items manually is restricted to OWNER only (anti-corruption rule)
router.post('/', requireRoles('OWNER'), createItem);
router.put('/:id', requireRoles('OWNER'), updateItem);

// Stock transfers & manual adjustments
router.post('/transfer-stock', requireRoles('OWNER', 'PRODUCTION_MANAGER'), transferStock);
router.post('/:id/adjust', requireRoles('OWNER'), adjustInventory);
router.post('/:id/reconcile', requireRoles('OWNER'), reconcileInventory);

// Archiving & restoring items remain restricted to OWNER only
router.patch('/:id/archive', requireRoles('OWNER'), archiveItem);
router.patch('/:id/restore', requireRoles('OWNER'), restoreItem);

export default router;

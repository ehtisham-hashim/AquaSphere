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
  getInventoryTransactions
} from '../controllers/item.controller.js';

const router = Router();

router.use(verifyJWT);

// GET is accessible to all authenticated roles
router.get('/transactions', getInventoryTransactions);
router.get('/', getItems);
router.get('/:id', getItemById);

// Adding & updating items is allowed for OWNER, ACCOUNTANT, PRODUCTION_MANAGER, and MATERIAL_MANAGER
router.post('/', requireRoles('OWNER', 'ACCOUNTANT', 'PRODUCTION_MANAGER', 'MATERIAL_MANAGER'), createItem);
router.put('/:id', requireRoles('OWNER', 'ACCOUNTANT', 'PRODUCTION_MANAGER', 'MATERIAL_MANAGER'), updateItem);

// Archiving & restoring items remain restricted to OWNER & ACCOUNTANT only
router.patch('/:id/archive', requireRoles('OWNER', 'ACCOUNTANT'), archiveItem);
router.patch('/:id/restore', requireRoles('OWNER', 'ACCOUNTANT'), restoreItem);
router.post('/:id/adjust', requireRoles('OWNER'), adjustInventory);

export default router;

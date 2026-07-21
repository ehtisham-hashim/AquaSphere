import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  archiveItem,
  restoreItem
} from '../controllers/item.controller.js';

const router = Router();

router.use(verifyJWT);

// GET is accessible to all authenticated roles (Production Manager needs to see inventory levels)
router.get('/', getItems);
router.get('/:id', getItemById);

// Mutations on the Raw Material master are Owner/Accountant only
router.post('/', requireRoles('OWNER', 'ACCOUNTANT'), createItem);
router.put('/:id', requireRoles('OWNER', 'ACCOUNTANT'), updateItem);
router.patch('/:id/archive', requireRoles('OWNER', 'ACCOUNTANT'), archiveItem);
router.patch('/:id/restore', requireRoles('OWNER', 'ACCOUNTANT'), restoreItem);

export default router;

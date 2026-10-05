import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import {
  getOperationalDefaults,
  updateOperationalDefaults
} from '../controllers/settings.controller.js';

const router = Router();

router.use(verifyJWT);

router.get('/operational-defaults', getOperationalDefaults);
router.put(
  '/operational-defaults',
  requireRoles(['OWNER', 'ADMIN', 'PRODUCTION_MANAGER', 'MARKETING_MANAGER']),
  updateOperationalDefaults
);

export default router;

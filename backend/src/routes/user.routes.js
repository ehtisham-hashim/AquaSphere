import { Router } from 'express';
import { getUsers, createUser, updateUser, toggleUserStatus } from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = Router();

router.use(verifyJWT);

router.get('/', requireRoles('OWNER', 'ADMIN'), getUsers);
router.post('/', requireRoles('OWNER'), createUser);
router.put('/:id', requireRoles('OWNER'), updateUser);
router.patch('/:id/status', requireRoles('OWNER'), toggleUserStatus);

export default router;

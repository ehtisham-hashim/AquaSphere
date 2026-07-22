import { Router } from 'express';
import { getUsers, createUser } from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = Router();

router.use(verifyJWT);
router.use(requireRoles('OWNER'));

router.get('/', getUsers);
router.post('/', createUser);

export default router;

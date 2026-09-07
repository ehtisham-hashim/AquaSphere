import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { getVehicles, addVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicle.controller.js';

const router = Router();
router.use(verifyJWT);

router.get('/', requireRoles('OWNER', 'TRANSPORT_MANAGER'), getVehicles);
router.post('/', requireRoles('TRANSPORT_MANAGER'), addVehicle);
router.put('/:id', requireRoles('TRANSPORT_MANAGER'), updateVehicle);
router.delete('/:id', requireRoles('TRANSPORT_MANAGER'), deleteVehicle);

export default router;

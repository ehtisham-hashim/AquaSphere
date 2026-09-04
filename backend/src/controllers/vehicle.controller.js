import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Retrieves all vehicles for the active tenant
 */
export const getVehicles = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);

  const vehicles = await prisma[`${prefix}Vehicle`].findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      plateNumber: true,
      model: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return sendSuccess(res, vehicles, 200);
});

/**
 * Creates a new vehicle entry
 */
export const addVehicle = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { name, plateNumber, model } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Vehicle name is required');
  }

  if (!plateNumber || !plateNumber.trim()) {
    throw new ApiError(400, 'Plate number is required');
  }

  const vehicle = await prisma[`${prefix}Vehicle`].create({
    data: {
      name: name.trim(),
      plateNumber: plateNumber.trim(),
      model: model ? model.trim() : null,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      plateNumber: true,
      model: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return sendSuccess(res, vehicle, 201);
});

/**
 * Updates an existing vehicle
 */
export const updateVehicle = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { name, plateNumber, model, isActive } = req.body;

  const existing = await prisma[`${prefix}Vehicle`].findUnique({
    where: { id }
  });

  if (!existing) {
    throw new ApiError(404, 'Vehicle not found');
  }

  const updateData = {};
  if (name !== undefined) {
    if (!name || !name.trim()) throw new ApiError(400, 'Vehicle name cannot be empty');
    updateData.name = name.trim();
  }
  if (plateNumber !== undefined) {
    if (!plateNumber || !plateNumber.trim()) throw new ApiError(400, 'Plate number cannot be empty');
    updateData.plateNumber = plateNumber.trim();
  }
  if (model !== undefined) {
    updateData.model = model ? model.trim() : null;
  }
  if (isActive !== undefined) {
    updateData.isActive = Boolean(isActive);
  }

  const updatedVehicle = await prisma[`${prefix}Vehicle`].update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      plateNumber: true,
      model: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return sendSuccess(res, updatedVehicle, 200);
});

/**
 * Soft-deletes a vehicle by marking isActive: false
 */
export const deleteVehicle = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  const existing = await prisma[`${prefix}Vehicle`].findUnique({
    where: { id }
  });

  if (!existing) {
    throw new ApiError(404, 'Vehicle not found');
  }

  const deactivated = await prisma[`${prefix}Vehicle`].update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      plateNumber: true,
      isActive: true
    }
  });

  return sendSuccess(res, deactivated, 200);
});

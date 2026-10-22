import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage, UPLOAD_FOLDERS } from '../utils/cloudinaryUpload.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';
import { broadcastEvent } from '../utils/sseBus.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';

export const sanitizeGoogleMapsUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  let clean = url.trim();
  if (!clean) return null;
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(clean)) {
    return `https://www.google.com/maps/search/?api=1&query=${clean.replace(/\s+/g, '')}`;
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  return clean;
};

export const isValidGoogleMapsUrl = (url) => {
  if (!url) return true;
  const clean = sanitizeGoogleMapsUrl(url);
  return ['maps.google.com', 'google.com/maps', 'goo.gl', 'maps.app.goo.gl'].some(d => clean.includes(d));
};

const extractTenantProductFields = (prefix, body) => {
  if (prefix === 'aquasphere') {
    const res = {};
    if (body.buys19L !== undefined) res.buys19L = Boolean(body.buys19L);
    if (body.qty19L !== undefined) res.qty19L = parseInt(body.qty19L, 10) || 0;
    if (body.buys05LPet !== undefined) res.buys05LPet = Boolean(body.buys05LPet);
    if (body.qty05LPet !== undefined) res.qty05LPet = parseInt(body.qty05LPet, 10) || 0;
    if (body.buys15LPet !== undefined) res.buys15LPet = Boolean(body.buys15LPet);
    if (body.qty15LPet !== undefined) res.qty15LPet = parseInt(body.qty15LPet, 10) || 0;
    return res;
  }
  const res = {};
  if (body.buysPure05L !== undefined) res.buysPure05L = Boolean(body.buysPure05L);
  if (body.qtyPure05L !== undefined) res.qtyPure05L = parseInt(body.qtyPure05L, 10) || 0;
  if (body.buysPure15L !== undefined) res.buysPure15L = Boolean(body.buysPure15L);
  if (body.qtyPure15L !== undefined) res.qtyPure15L = parseInt(body.qtyPure15L, 10) || 0;
  if (body.buysMix05L !== undefined) res.buysMix05L = Boolean(body.buysMix05L);
  if (body.qtyMix05L !== undefined) res.qtyMix05L = parseInt(body.qtyMix05L, 10) || 0;
  if (body.buysMix15L !== undefined) res.buysMix15L = Boolean(body.buysMix15L);
  if (body.qtyMix15L !== undefined) res.qtyMix15L = parseInt(body.qtyMix15L, 10) || 0;
  return res;
};

/** Retrieves customers with optional search filtering */
export const getCustomers = asyncHandler(async (req, res) => {
  const { search, status, page, limit } = req.query;
  const prefix = getTenantPrefix(req);

  let archivedFilter = { archivedAt: null };
  if (status === 'archived') archivedFilter = { archivedAt: { not: null } };
  else if (status === 'all') archivedFilter = {};

  const where = search ? {
    ...archivedFilter,
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } }
    ]
  } : archivedFilter;

  const hasExplicitLimit = limit !== undefined && limit !== '' && limit !== 'all';

  if (hasExplicitLimit) {
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
    const parsedPage = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const [customers, total] = await Promise.all([
      prisma[`${prefix}Customer`].findMany({
        where,
        skip,
        take: parsedLimit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma[`${prefix}Customer`].count({ where })
    ]);

    return sendSuccess(res, customers, 200, {
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit) || 1
      }
    });
  }

  const customers = await prisma[`${prefix}Customer`].findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return sendSuccess(res, customers);
});

/** Retrieves detailed customer history */
export const getCustomerDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  const [customer, auditLogs] = await Promise.all([
    prisma[`${prefix}Customer`].findUnique({
      where: { id },
      include: {
        orders: {
          select: {
            id: true, type: true, deliveryStatus: true, paymentStatus: true, expectedDelivery: true, remarks: true, createdAt: true,
            items: { select: { id: true, quantity: true, price: true, item: { select: { id: true, name: true, type: true } } } },
            deliveries: { select: { id: true, qtyDelivered: true, bottlesReturnedGood: true, bottlesReturnedBroken: true, cashReceived: true, paymentMethod: true, deliveredAt: true, remarks: true } },
            payments: { select: { id: true, amount: true, type: true, createdAt: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        bottleTransactions: {
          select: { id: true, type: true, quantity: true, reason: true, runningBalance: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          select: { id: true, amount: true, type: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    }),
    prisma[`${prefix}AuditLog`].findMany({
      where: { entityType: 'Customer', entityId: id },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  if (!customer) throw new ApiError(404, 'Customer not found');
  return sendSuccess(res, { ...customer, auditLogs });
});

/** Creates a new customer or restores archived record */
export const createCustomer = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { name, phone, type, address, mapLink, securityDeposit, currentBalance, creditDuration, remarks, homePictureUrl } = req.body;

  if (!name || !phone || !type) throw new ApiError(400, 'Name, phone, and type required');
  if (mapLink && !isValidGoogleMapsUrl(mapLink)) {
    throw new ApiError(400, 'Invalid Google Maps URL');
  }

  const customerData = {
    name: name.trim(),
    phone: phone.trim(),
    type,
    address: address || null,
    mapLink: mapLink ? sanitizeGoogleMapsUrl(mapLink) : null,
    deposit: securityDeposit ? parseInt(securityDeposit, 10) : 0,
    currentBalance: currentBalance ? parseFloat(currentBalance) : 0.0,
    creditDuration: creditDuration ? parseInt(creditDuration, 10) : 1,
    remarks: remarks || null,
    homePictureUrl: homePictureUrl || null,
    archivedAt: null,
    ...extractTenantProductFields(prefix, req.body)
  };

  const [archivedCustomer, activeCustomer] = await Promise.all([
    prisma[`${prefix}Customer`].findFirst({ where: { phone: customerData.phone, archivedAt: { not: null } } }),
    prisma[`${prefix}Customer`].findFirst({ where: { phone: customerData.phone, archivedAt: null } })
  ]);

  if (activeCustomer) throw new ApiError(400, `A customer with phone number "${phone}" already exists.`);

  const customer = archivedCustomer
    ? await prisma[`${prefix}Customer`].update({ where: { id: archivedCustomer.id }, data: customerData })
    : await prisma[`${prefix}Customer`].create({ data: customerData });

  await createAuditLog(prefix, {
    action: 'CUSTOMER_CREATED',
    entityType: 'Customer',
    entityId: customer.id,
    performedBy: req.user?.name || req.user?.id || 'Admin',
    details: `Customer Created: ${customer.name} (${customer.phone}) - Type: ${customer.type}`
  });

  broadcastEvent(prefix, 'CUSTOMER_UPDATED', { customerId: customer.id });
  return sendSuccess(res, customer, 201);
});

/** Updates customer profile */
export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const { name, phone, type, address, mapLink, securityDeposit, creditDuration, remarks, homePictureUrl } = req.body;

  const existing = await prisma[`${prefix}Customer`].findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Customer not found');
  if (mapLink && !isValidGoogleMapsUrl(mapLink)) throw new ApiError(400, 'Invalid Google Maps URL');

  const updateData = { ...extractTenantProductFields(prefix, req.body) };
  if (name !== undefined) {
    if (!name.trim()) throw new ApiError(400, 'Customer name must be non-empty');
    updateData.name = name.trim();
  }
  if (phone !== undefined) {
    if (!phone.trim()) throw new ApiError(400, 'Customer phone must be non-empty');
    updateData.phone = phone.trim();
  }
  if (type !== undefined) updateData.type = type;
  if (address !== undefined) updateData.address = address;
  if (mapLink !== undefined) updateData.mapLink = mapLink ? sanitizeGoogleMapsUrl(mapLink) : null;
  if (securityDeposit !== undefined) updateData.deposit = parseInt(securityDeposit, 10) || 0;
  if (creditDuration !== undefined) updateData.creditDuration = parseInt(creditDuration, 10) || 1;
  if (remarks !== undefined) updateData.remarks = remarks;
  if (homePictureUrl !== undefined) updateData.homePictureUrl = homePictureUrl;

  const customer = await prisma[`${prefix}Customer`].update({ where: { id }, data: updateData });
  const performedBy = req.user?.name || req.user?.id || 'Admin';

  if (phone !== undefined && phone.trim() !== existing.phone) {
    await createAuditLog(prefix, {
      action: 'PHONE_CHANGED',
      entityType: 'Customer',
      entityId: id,
      performedBy,
      details: `Phone number changed from '${existing.phone}' to '${phone.trim()}'`
    });
  }

  await createAuditLog(prefix, {
    action: 'CUSTOMER_EDITED',
    entityType: 'Customer',
    entityId: id,
    performedBy,
    details: `Customer details updated for ${existing.name}`
  });

  broadcastEvent(prefix, 'CUSTOMER_UPDATED', { customerId: customer.id });
  return sendSuccess(res, customer);
});

/** Deletes a customer permanently (cascading child data) or archives if requested */
export const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const isArchiveOnly = req.query.archive === 'true';

  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only Owner can delete customer records (Anti-Corruption Feature)');
  }

  const customer = await prisma[`${prefix}Customer`].findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          items: { include: { item: true } },
          deliveries: true,
          payments: true
        }
      },
      spotSales: {
        include: { items: true }
      }
    }
  });
  if (!customer) throw new ApiError(404, 'Customer not found');

  if (isArchiveOnly) {
    await prisma[`${prefix}Customer`].update({
      where: { id },
      data: { archivedAt: new Date(), phone: `${customer.phone}_archived_${Date.now()}` }
    });

    await createAuditLog(prefix, {
      action: 'CUSTOMER_ARCHIVED',
      entityType: 'Customer',
      entityId: id,
      performedBy: req.user?.name || req.user?.id || 'Admin',
      details: `Customer ${customer.name} (${customer.phone}) soft-archived`
    });

    broadcastEvent(prefix, 'CUSTOMER_UPDATED', { customerId: id });
    return sendSuccess(res, null, 200, { message: 'Customer archived successfully' });
  }

  // Permanent Deletion: Cleanly cascade all relations so foreign key constraints never fail
  await prisma.$transaction(async (tx) => {
    // 1. Revert & clean up all customer orders
    for (const ord of customer.orders) {
      if (ord.deliveryStatus === 'DELIVERED') {
        for (const item of ord.items) {
          if (item.itemId) {
            const packMultiplier = Number(item.item?.packSize || 1);
            const qtyToRestore = Number(item.quantity || 0) * packMultiplier;
            await tx[`${prefix}Item`].update({
              where: { id: item.itemId },
              data: { cachedQty: { increment: qtyToRestore }, factoryQty: { increment: qtyToRestore } }
            });
            await tx[`${prefix}InventoryTransaction`].create({
              data: {
                itemId: item.itemId,
                quantity: qtyToRestore,
                direction: 'IN',
                reason: 'CUSTOMER_DELETED_STOCK_RESTORE',
                refType: 'ORDER',
                refId: ord.id,
                location: 'FACTORY'
              }
            });
          }
        }

        const retGoodTotal = ord.deliveries?.reduce((sum, d) => sum + (d.bottlesReturnedGood || 0), 0) || 0;
        if (retGoodTotal > 0) {
          const emptyBottle = await tx[`${prefix}Item`].findFirst({
            where: { type: 'RAW_MATERIAL', name: { contains: 'empty', mode: 'insensitive' } }
          });
          if (emptyBottle) {
            await tx[`${prefix}Item`].update({
              where: { id: emptyBottle.id },
              data: { cachedQty: { decrement: retGoodTotal }, factoryQty: { decrement: retGoodTotal } }
            });
          }
        }
      }

      await tx[`${prefix}BottleTransaction`].deleteMany({
        where: { OR: [{ orderId: ord.id }, { reason: { contains: ord.id } }] }
      });
      await tx[`${prefix}InventoryTransaction`].deleteMany({
        where: { refType: 'ORDER', refId: ord.id }
      });
      await tx[`${prefix}Delivery`].deleteMany({ where: { orderId: ord.id } });
      await tx[`${prefix}Payment`].deleteMany({ where: { orderId: ord.id } });
      await tx[`${prefix}OrderItem`].deleteMany({ where: { orderId: ord.id } });
      await tx[`${prefix}Order`].delete({ where: { id: ord.id } });
    }

    // 2. Clean up bottle transactions for this customer
    await tx[`${prefix}BottleTransaction`].deleteMany({ where: { customerId: id } });

    // 3. Clean up payments for this customer
    await tx[`${prefix}Payment`].deleteMany({ where: { customerId: id } });

    // 4. Clean up spot sales for this customer
    for (const ss of customer.spotSales) {
      await tx[`${prefix}SpotSaleItem`].deleteMany({ where: { spotSaleId: ss.id } });
      await tx[`${prefix}SpotSale`].delete({ where: { id: ss.id } });
    }

    // 5. Delete Customer record
    await tx[`${prefix}Customer`].delete({ where: { id } });

    await createAuditLog(prefix, {
      action: 'CUSTOMER_DELETED',
      entityType: 'Customer',
      entityId: id,
      performedBy: req.user?.name || req.user?.id || 'OWNER',
      details: `Customer ${customer.name} (${customer.phone}) and all associated orders/payments permanently deleted`
    });
  }, { maxWait: 10000, timeout: 30000 });

  broadcastDashboardUpdate(prefix);
  broadcastEvent(prefix, 'CUSTOMER_UPDATED', { deletedCustomerId: id });
  broadcastEvent(prefix, 'ORDER_UPDATED');
  broadcastEvent(prefix, 'INVENTORY_CHANGED');
  return sendSuccess(res, null, 200, { message: 'Customer and all associated records permanently deleted successfully' });
});

/** Restores an archived customer */
export const restoreCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  const customer = await prisma[`${prefix}Customer`].findUnique({ where: { id } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  const cleanPhone = customer.phone.includes('_archived_') ? customer.phone.split('_archived_')[0] : customer.phone;

  const updated = await prisma[`${prefix}Customer`].update({
    where: { id },
    data: { archivedAt: null, phone: cleanPhone }
  });

  await createAuditLog(prefix, {
    action: 'CUSTOMER_RESTORED',
    entityType: 'Customer',
    entityId: id,
    performedBy: req.user?.name || req.user?.id || 'Admin',
    details: `Customer ${updated.name} restored from archive`
  });

  broadcastEvent(prefix, 'CUSTOMER_UPDATED', { customerId: id });
  return sendSuccess(res, updated, 200, { message: 'Customer unarchived successfully' });
});

/** Uploads customer premises picture */
export const uploadCustomerPicture = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Image file is required');
  const { secure_url, public_id } = await uploadImage(req.file, UPLOAD_FOLDERS.CUSTOMERS);
  return sendSuccess(res, { homePictureUrl: secure_url, publicId: public_id }, 200, {
    homePictureUrl: secure_url,
    publicId: public_id
  });
});


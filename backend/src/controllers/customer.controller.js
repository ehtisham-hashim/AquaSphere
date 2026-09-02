import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage, UPLOAD_FOLDERS } from '../utils/cloudinaryUpload.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';

export const isValidGoogleMapsUrl = (url) => {
  if (!url) return true;
  return ['maps.google.com', 'google.com/maps', 'goo.gl', 'maps.app.goo.gl'].some(d => url.includes(d));
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
  const { search, status } = req.query;
  const prefix = getTenantPrefix(req);

  // Security / Anti-poaching protection: MARKETING_MANAGER can only search customers by name/phone, cannot dump entire customer list
  if (req.user?.role === 'MARKETING_MANAGER' && (!search || !search.trim())) {
    return sendSuccess(res, []);
  }

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

  const customers = await prisma[`${prefix}Customer`].findMany({
    where,
    take: 50,
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
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        bottleTransactions: {
          select: { id: true, type: true, quantity: true, reason: true, runningBalance: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        payments: {
          select: { id: true, amount: true, type: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    }),
    prisma[`${prefix}AuditLog`].findMany({
      where: { entityType: 'Customer', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  ]);

  if (!customer) throw new ApiError(404, 'Customer not found');
  return sendSuccess(res, { ...customer, auditLogs });
});

/** Creates a new customer or restores archived record */
export const createCustomer = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { name, phone, type, address, mapLink, securityDeposit, currentBalance, creditLimit, creditDuration, remarks, homePictureUrl } = req.body;

  if (!name || !phone || !type) throw new ApiError(400, 'Name, phone, and type required');
  if (mapLink && !isValidGoogleMapsUrl(mapLink)) {
    throw new ApiError(400, 'Invalid Google Maps URL');
  }

  const customerData = {
    name: name.trim(),
    phone: phone.trim(),
    type,
    address: address || null,
    mapLink: mapLink || null,
    deposit: securityDeposit ? parseInt(securityDeposit, 10) : 0,
    currentBalance: currentBalance ? parseFloat(currentBalance) : 0.0,
    creditLimit: creditLimit ? parseFloat(creditLimit) : 0.0,
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
    details: `Customer Created: ${customer.name} (${customer.phone}) - Type: ${customer.type}, Credit Limit: Rs. ${customer.creditLimit}`
  });

  return sendSuccess(res, customer, 201);
});

/** Updates customer profile */
export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const { name, phone, type, address, mapLink, securityDeposit, creditLimit, creditDuration, remarks, homePictureUrl } = req.body;

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
  if (mapLink !== undefined) updateData.mapLink = mapLink;
  if (securityDeposit !== undefined) updateData.deposit = parseInt(securityDeposit, 10) || 0;
  if (creditLimit !== undefined) updateData.creditLimit = parseFloat(creditLimit) || 0;
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

  if (creditLimit !== undefined && parseFloat(creditLimit) !== parseFloat(existing.creditLimit || 0)) {
    await createAuditLog(prefix, {
      action: 'CREDIT_LIMIT_CHANGED',
      entityType: 'Customer',
      entityId: id,
      performedBy,
      details: `Credit limit changed from Rs. ${parseFloat(existing.creditLimit || 0).toLocaleString()} to Rs. ${parseFloat(creditLimit).toLocaleString()}`
    });
  }

  await createAuditLog(prefix, {
    action: 'CUSTOMER_EDITED',
    entityType: 'Customer',
    entityId: id,
    performedBy,
    details: `Customer details updated for ${existing.name}`
  });

  return sendSuccess(res, customer);
});

/** Soft deletes a customer */
export const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only Owner can delete customer records (Anti-Corruption Feature)');
  }

  const customer = await prisma[`${prefix}Customer`].findUnique({ where: { id } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  await prisma[`${prefix}Customer`].update({
    where: { id },
    data: { archivedAt: new Date(), phone: `${customer.phone}_archived_${Date.now()}` }
  });

  await createAuditLog(prefix, {
    action: 'CUSTOMER_DELETED',
    entityType: 'Customer',
    entityId: id,
    performedBy: req.user?.name || req.user?.id || 'Admin',
    details: `Customer ${customer.name} (${customer.phone}) soft deleted`
  });

  return sendSuccess(res, null, 200, { message: 'Customer deleted successfully' });
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

  return sendSuccess(res, updated, 200, { message: 'Customer unarchived successfully' });
});

/** Uploads customer premises picture */
export const uploadCustomerPicture = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Image file is required');
  const { secure_url, public_id } = await uploadImage(req.file, UPLOAD_FOLDERS.CUSTOMERS);
  return sendSuccess(res, { homePictureUrl: secure_url, publicId: public_id });
});


import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage, UPLOAD_FOLDERS } from '../utils/cloudinaryUpload.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';

const getPrefix = getTenantPrefix;

export const isValidGoogleMapsUrl = (url) => {
  if (!url) return true;
  const validDomains = ['maps.google.com', 'google.com/maps', 'goo.gl', 'maps.app.goo.gl'];
  return validDomains.some(d => url.includes(d));
};

export const getCustomers = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const prefix = getPrefix(req);
  
  let archivedFilter = { archivedAt: null };
  if (status === 'archived') {
    archivedFilter = { archivedAt: { not: null } };
  } else if (status === 'all') {
    archivedFilter = {};
  }

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

  res.json({ success: true, data: customers });
});

// Get single customer with bounded history
export const getCustomerDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getPrefix(req);

  const customer = await prisma[`${prefix}Customer`].findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          items: { include: { item: true } },
          deliveries: true,
          payments: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      },
      bottleTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 50
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 50
      }
    }
  });

  if (!customer) throw new ApiError(404, 'Customer not found');

  // Fetch audit logs separately (not directly related in schema)
  const auditLogs = await prisma[`${prefix}AuditLog`].findMany({
    where: {
      entityType: 'Customer',
      entityId: id
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  res.json({
    success: true,
    data: {
      ...customer,
      auditLogs
    }
  });
});

// Handles customer creation; uses regenerated Prisma schema with deposit synced
export const createCustomer = asyncHandler(async (req, res) => {
  const { 
    name, phone, type, address, mapLink, securityDeposit, currentBalance,
    creditLimit, creditDuration, remarks, homePictureUrl,
    buys19L, qty19L, buys05LPet, qty05LPet, buys15LPet, qty15LPet,
    buysPure05L, qtyPure05L, buysPure15L, qtyPure15L, 
    buysMix05L, qtyMix05L, buysMix15L, qtyMix15L
  } = req.body;
  const prefix = getPrefix(req);
  
  if (!name || !phone || !type) throw new ApiError(400, 'Name, phone, and type required');

  if (mapLink && !isValidGoogleMapsUrl(mapLink)) {
    throw new ApiError(400, 'Invalid Google Maps URL. Must contain maps.google.com, google.com/maps, or goo.gl');
  }

  const customerData = { 
    name, 
    phone, 
    type, 
    address,
    mapLink,
    deposit: securityDeposit ? parseInt(securityDeposit) : 0,
    currentBalance: currentBalance ? parseFloat(currentBalance) : 0.0,
    creditLimit: creditLimit ? parseFloat(creditLimit) : 0.0,
    creditDuration: creditDuration ? parseInt(creditDuration) : 1,
    remarks,
    homePictureUrl,
    archivedAt: null
  };

  if (prefix === 'aquasphere') {
    customerData.buys19L = Boolean(buys19L);
    customerData.qty19L = qty19L ? parseInt(qty19L) : 0;
    customerData.buys05LPet = Boolean(buys05LPet);
    customerData.qty05LPet = qty05LPet ? parseInt(qty05LPet) : 0;
    customerData.buys15LPet = Boolean(buys15LPet);
    customerData.qty15LPet = qty15LPet ? parseInt(qty15LPet) : 0;
  } else {
    customerData.buysPure05L = Boolean(buysPure05L);
    customerData.qtyPure05L = qtyPure05L ? parseInt(qtyPure05L) : 0;
    customerData.buysPure15L = Boolean(buysPure15L);
    customerData.qtyPure15L = qtyPure15L ? parseInt(qtyPure15L) : 0;
    customerData.buysMix05L = Boolean(buysMix05L);
    customerData.qtyMix05L = qtyMix05L ? parseInt(qtyMix05L) : 0;
    customerData.buysMix15L = Boolean(buysMix15L);
    customerData.qtyMix15L = qtyMix15L ? parseInt(qtyMix15L) : 0;
  }

  // Check if an archived record with the same phone exists
  const archivedCustomer = await prisma[`${prefix}Customer`].findFirst({
    where: { phone, archivedAt: { not: null } }
  });

  // Check if an ACTIVE record with the same phone already exists
  const activeCustomer = await prisma[`${prefix}Customer`].findFirst({
    where: { phone, archivedAt: null }
  });

  if (activeCustomer) {
    throw new ApiError(400, `A customer with phone number "${phone}" already exists. Each customer must have a unique phone number.`);
  }

  let customer;
  if (archivedCustomer) {
    // Unarchive and overwrite customer record
    customer = await prisma[`${prefix}Customer`].update({
      where: { id: archivedCustomer.id },
      data: customerData
    });
  } else {
    customer = await prisma[`${prefix}Customer`].create({
      data: customerData
    });
  }

  const performedBy = req.user ? `${req.user.name || req.user.role || 'User'} (${req.user.id.substring(0, 6)})` : 'Admin';

  await createAuditLog(prefix, {
    action: 'CUSTOMER_CREATED',
    entityType: 'Customer',
    entityId: customer.id,
    performedBy,
    details: `Customer Created: ${customer.name} (${customer.phone}) - Type: ${customer.type}, Credit Limit: Rs. ${customer.creditLimit}`
  });

  res.status(201).json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    name, phone, type, address, mapLink, securityDeposit,
    creditLimit, creditDuration, remarks, homePictureUrl,
    buys19L, qty19L, buys05LPet, qty05LPet, buys15LPet, qty15LPet,
    buysPure05L, qtyPure05L, buysPure15L, qtyPure15L,
    buysMix05L, qtyMix05L, buysMix15L, qtyMix15L
  } = req.body;
  const prefix = getPrefix(req);

  const existing = await prisma[`${prefix}Customer`].findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Customer not found');

  if (mapLink && !isValidGoogleMapsUrl(mapLink)) {
    throw new ApiError(400, 'Invalid Google Maps URL');
  }

  const updateData = {
    ...(name !== undefined && { name }),
    ...(phone !== undefined && { phone }),
    ...(type !== undefined && { type }),
    ...(address !== undefined && { address }),
    ...(mapLink !== undefined && { mapLink }),
    ...(securityDeposit !== undefined && { deposit: parseInt(securityDeposit || 0) }),
    ...(creditLimit !== undefined && { creditLimit: parseFloat(creditLimit || 0) }),
    ...(creditDuration !== undefined && { creditDuration: parseInt(creditDuration || 1) }),
    ...(remarks !== undefined && { remarks }),
    ...(homePictureUrl !== undefined && { homePictureUrl })
  };

  if (prefix === 'aquasphere') {
    if (buys19L !== undefined) updateData.buys19L = Boolean(buys19L);
    if (qty19L !== undefined) updateData.qty19L = parseInt(qty19L || 0);
    if (buys05LPet !== undefined) updateData.buys05LPet = Boolean(buys05LPet);
    if (qty05LPet !== undefined) updateData.qty05LPet = parseInt(qty05LPet || 0);
    if (buys15LPet !== undefined) updateData.buys15LPet = Boolean(buys15LPet);
    if (qty15LPet !== undefined) updateData.qty15LPet = parseInt(qty15LPet || 0);
  } else {
    if (buysPure05L !== undefined) updateData.buysPure05L = Boolean(buysPure05L);
    if (qtyPure05L !== undefined) updateData.qtyPure05L = parseInt(qtyPure05L || 0);
    if (buysPure15L !== undefined) updateData.buysPure15L = Boolean(buysPure15L);
    if (qtyPure15L !== undefined) updateData.qtyPure15L = parseInt(qtyPure15L || 0);
    if (buysMix05L !== undefined) updateData.buysMix05L = Boolean(buysMix05L);
    if (qtyMix05L !== undefined) updateData.qtyMix05L = parseInt(qtyMix05L || 0);
    if (buysMix15L !== undefined) updateData.buysMix15L = Boolean(buysMix15L);
    if (qtyMix15L !== undefined) updateData.qtyMix15L = parseInt(qtyMix15L || 0);
  }

  const performedBy = req.user ? `${req.user.name || req.user.role || 'User'} (${req.user.id.substring(0, 6)})` : 'Admin';

  if (phone !== undefined && phone !== existing.phone) {
    await createAuditLog(prefix, {
      action: 'PHONE_CHANGED',
      entityType: 'Customer',
      entityId: id,
      performedBy,
      details: `Phone number changed from '${existing.phone}' to '${phone}'`
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

  const customer = await prisma[`${prefix}Customer`].update({
    where: { id },
    data: updateData
  });

  res.json({ success: true, data: customer });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getPrefix(req);

  if (!['OWNER', 'MARKETING_MANAGER'].includes(req.user?.role)) {
    throw new ApiError(403, 'Only Owner or Marketing Manager can delete customer records');
  }

  const customer = await prisma[`${prefix}Customer`].findUnique({ where: { id } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  const performedBy = req.user ? `${req.user.name || req.user.role || 'User'} (${req.user.id.substring(0, 6)})` : 'Admin';

  await prisma[`${prefix}Customer`].update({
    where: { id },
    data: { 
      archivedAt: new Date(),
      phone: `${customer.phone}_archived_${Date.now()}`
    }
  });

  await createAuditLog(prefix, {
    action: 'CUSTOMER_DELETED',
    entityType: 'Customer',
    entityId: id,
    performedBy,
    details: `Customer ${customer.name} (${customer.phone}) soft deleted`
  });

  res.json({ success: true, message: 'Customer deleted successfully' });
});

export const restoreCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getPrefix(req);

  const customer = await prisma[`${prefix}Customer`].findUnique({ where: { id } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  const cleanPhone = customer.phone.includes('_archived_') 
    ? customer.phone.split('_archived_')[0] 
    : customer.phone;

  const updated = await prisma[`${prefix}Customer`].update({
    where: { id },
    data: { 
      archivedAt: null,
      phone: cleanPhone
    }
  });

  const performedBy = req.user ? `${req.user.name || req.user.role || 'User'} (${req.user.id.substring(0, 6)})` : 'Admin';

  await createAuditLog(prefix, {
    action: 'CUSTOMER_RESTORED',
    entityType: 'Customer',
    entityId: id,
    performedBy,
    details: `Customer ${updated.name} restored from archive`
  });

  res.json({ success: true, data: updated, message: 'Customer unarchived successfully' });
});

export const uploadCustomerPicture = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Image file is required');
  const { secure_url, public_id } = await uploadImage(req.file, UPLOAD_FOLDERS.CUSTOMERS);
  res.status(200).json({ 
    success: true, 
    homePictureUrl: secure_url,
    publicId: public_id
  });
});

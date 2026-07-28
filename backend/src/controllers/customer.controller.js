import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const getPrefix = (req) => (req.headers['x-tenant'] || 'aquasphere').toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';

export const isValidGoogleMapsUrl = (url) => {
  if (!url) return true;
  const validDomains = ['maps.google.com', 'google.com/maps', 'goo.gl', 'maps.app.goo.gl'];
  return validDomains.some(d => url.includes(d));
};

export const getCustomers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const prefix = getPrefix(req);
  
  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } }
    ],
    archivedAt: null
  } : { archivedAt: null };

  const customers = await prisma[`${prefix}Customer`].findMany({
    where,
    take: 50,
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: customers });
});

// Handles customer creation; uses regenerated Prisma schema with securityDeposit synced
export const createCustomer = asyncHandler(async (req, res) => {
  const { 
    name, phone, type, address, mapLink, securityDeposit,
    creditLimit, creditDuration, remarks, homePictureUrl,
    buys19L, buys05LPet, buys15LPet,
    buysPure05L, buysPure15L, buysMix05L, buysMix15L
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
    securityDeposit: securityDeposit ? parseInt(securityDeposit) : 0,
    creditLimit: creditLimit ? parseFloat(creditLimit) : 0.0,
    creditDuration: creditDuration ? parseInt(creditDuration) : 1,
    remarks,
    homePictureUrl
  };

  if (prefix === 'aquasphere') {
    customerData.buys19L = Boolean(buys19L);
    customerData.buys05LPet = Boolean(buys05LPet);
    customerData.buys15LPet = Boolean(buys15LPet);
  } else {
    customerData.buysPure05L = Boolean(buysPure05L);
    customerData.buysPure15L = Boolean(buysPure15L);
    customerData.buysMix05L = Boolean(buysMix05L);
    customerData.buysMix15L = Boolean(buysMix15L);
  }

  const customer = await prisma[`${prefix}Customer`].create({
    data: customerData
  });

  await prisma[`${prefix}AuditLog`].create({
    data: {
      action: 'CUSTOMER_ADDED',
      entityType: 'Customer',
      entityId: customer.id,
      performedBy: req.user?.id || 'Unknown',
      details: `New Customer Added: ${customer.name} (${customer.phone})`
    }
  });

  res.status(201).json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    name, phone, type, address, mapLink, securityDeposit,
    creditLimit, creditDuration, remarks, homePictureUrl,
    buys19L, buys05LPet, buys15LPet,
    buysPure05L, buysPure15L, buysMix05L, buysMix15L
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
    ...(securityDeposit !== undefined && { securityDeposit: parseInt(securityDeposit || 0) }),
    ...(creditLimit !== undefined && { creditLimit: parseFloat(creditLimit || 0) }),
    ...(creditDuration !== undefined && { creditDuration: parseInt(creditDuration || 1) }),
    ...(remarks !== undefined && { remarks }),
    ...(homePictureUrl !== undefined && { homePictureUrl })
  };

  if (prefix === 'aquasphere') {
    if (buys19L !== undefined) updateData.buys19L = Boolean(buys19L);
    if (buys05LPet !== undefined) updateData.buys05LPet = Boolean(buys05LPet);
    if (buys15LPet !== undefined) updateData.buys15LPet = Boolean(buys15LPet);
  } else {
    if (buysPure05L !== undefined) updateData.buysPure05L = Boolean(buysPure05L);
    if (buysPure15L !== undefined) updateData.buysPure15L = Boolean(buysPure15L);
    if (buysMix05L !== undefined) updateData.buysMix05L = Boolean(buysMix05L);
    if (buysMix15L !== undefined) updateData.buysMix15L = Boolean(buysMix15L);
  }

  const customer = await prisma[`${prefix}Customer`].update({
    where: { id },
    data: updateData
  });

  res.json({ success: true, data: customer });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getPrefix(req);

  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only Owner can delete customer records');
  }

  const customer = await prisma[`${prefix}Customer`].findUnique({ where: { id } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  await prisma[`${prefix}Customer`].update({
    where: { id },
    data: { archivedAt: new Date() }
  });

  await prisma[`${prefix}AuditLog`].create({
    data: {
      action: 'CUSTOMER_DELETED',
      entityType: 'Customer',
      entityId: id,
      performedBy: req.user?.id || 'Unknown',
      details: `Customer ${customer.name} (${customer.phone}) deleted`
    }
  });

  res.json({ success: true, message: 'Customer deleted successfully' });
});

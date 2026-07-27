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

export const createCustomer = asyncHandler(async (req, res) => {
  const { 
    name, phone, type, address, mapLink, deposit, securityDeposit,
    defaultPrice, creditLimit, creditDuration, remarks, homePictureUrl 
  } = req.body;
  const prefix = getPrefix(req);
  
  if (!name || !phone || !type) throw new ApiError(400, 'Name, phone, and type required');

  const normalizedDeposit = securityDeposit ?? deposit;

  if (mapLink && !isValidGoogleMapsUrl(mapLink)) {
    throw new ApiError(400, 'Invalid Google Maps URL. Must contain maps.google.com, google.com/maps, or goo.gl');
  }

  const customer = await prisma[`${prefix}Customer`].create({
    data: { 
      name, 
      phone, 
      type, 
      address,
      mapLink,
      deposit: normalizedDeposit ? parseInt(normalizedDeposit) : 0,
      defaultPrice: defaultPrice ? parseFloat(defaultPrice) : 0.0,
      creditLimit: creditLimit ? parseFloat(creditLimit) : 0.0,
      creditDuration: creditDuration ? parseInt(creditDuration) : 1,
      remarks,
      homePictureUrl
    }
  });

  await prisma[`${prefix}AuditLog`].create({
    data: {
      action: 'CUSTOMER_ADDED',
      entityType: 'Customer',
      entityId: customer.id,
      performedBy: req.user?.id || 'Unknown',
      details: `New Customer Added: ${customer.name} (${customer.phone}) | Deposit: ${customer.deposit || 0}`
    }
  });

  res.status(201).json({ success: true, data: customer });
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


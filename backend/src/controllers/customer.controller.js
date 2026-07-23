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
    name, phone, type, address, mapLink, deposit, 
    defaultPrice, creditLimit, creditDuration, remarks, homePictureUrl 
  } = req.body;
  const prefix = getPrefix(req);
  
  if (!name || !phone || !type) throw new ApiError(400, 'Name, phone, and type required');

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
      deposit: deposit ? parseInt(deposit) : 0,
      defaultPrice: defaultPrice ? parseFloat(defaultPrice) : 0.0,
      creditLimit: creditLimit ? parseFloat(creditLimit) : 0.0,
      creditDuration: creditDuration ? parseInt(creditDuration) : 1,
      remarks,
      homePictureUrl
    }
  });

  res.status(201).json({ success: true, data: customer });
});

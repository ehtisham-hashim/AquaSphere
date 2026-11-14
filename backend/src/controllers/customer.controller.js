import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage, UPLOAD_FOLDERS } from '../utils/cloudinaryUpload.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';
import { broadcastEvent } from '../utils/sseBus.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import Papa from 'papaparse';
import {
  getCustomerReturnableCustodyBreakdown,
  getAllReturnableRawMaterials,
  debitEmptyBottlesFromFactory,
  resolveReturnableRawMaterial
} from '../services/bottleInventory.service.js';

/** Normalizes Pakistani phone numbers to 03XXXXXXXXX format */
export const normalizePakistanPhone = (rawPhone) => {
  if (!rawPhone) return '';
  let digits = String(rawPhone).trim().replace(/[^\d+]/g, '');
  if (digits.startsWith('+92')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('92') && digits.length === 12) digits = '0' + digits.slice(2);
  else if (digits.startsWith('3') && digits.length === 10) digits = '0' + digits;
  return digits;
};

export const parseBoolCsv = (val) => {
  if (typeof val === 'boolean') return val;
  return ['true', 'yes', 'y', '1', 'on'].includes(String(val || '').trim().toLowerCase());
};

export const normalizeCustomerType = (rawType) => {
  const s = String(rawType || '').trim().toLowerCase();
  if (!s) return 'Home';
  if (s.includes('comm') || s.includes('shop') || s.includes('mart') || s.includes('store')) return 'Commercial';
  if (s.includes('corp') || s.includes('office') || s.includes('clinic') || s.includes('bank') || s.includes('school')) return 'Corporate';
  if (s.includes('dist') || s.includes('whole') || s.includes('agency')) return 'Distributor';
  if (s.includes('ind') || s.includes('factory') || s.includes('plant')) return 'Industrial';
  const valid = ['Home', 'Commercial', 'Corporate', 'Distributor', 'Industrial'];
  return valid.find(t => t.toLowerCase() === s) || 'Home';
};

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
  if (body.buysPureFine05L !== undefined) res.buysPureFine05L = Boolean(body.buysPureFine05L);
  if (body.qtyPureFine05L !== undefined) res.qtyPureFine05L = parseInt(body.qtyPureFine05L, 10) || 0;
  if (body.buysPureFine15L !== undefined) res.buysPureFine15L = Boolean(body.buysPureFine15L);
  if (body.qtyPureFine15L !== undefined) res.qtyPureFine15L = parseInt(body.qtyPureFine15L, 10) || 0;
  return res;
};

/** Helper to retrieve or initialize the Marketer Registry from TenantSetting */
export async function getMarketersRegistry(prefix) {
  try {
    const setting = await prisma[`${prefix}TenantSetting`].findUnique({
      where: { key: 'MARKETERS_REGISTRY' }
    });
    if (setting?.value && Array.isArray(setting.value.marketers)) {
      return setting.value;
    }
  } catch (err) {
    console.error('Failed to load MARKETERS_REGISTRY from DB:', err);
  }

  // Scan existing customers to seed known marketers
  let nextSeq = 1;
  const existingCustomers = await prisma[`${prefix}Customer`].findMany({
    where: { marketerRef: { not: null } },
    select: { marketerRef: true }
  });

  const marketers = [];
  const seenNames = new Set();

  for (const c of existingCustomers) {
    const raw = (c.marketerRef || '').trim();
    if (!raw || raw.toLowerCase() === 'direct' || seenNames.has(raw.toLowerCase())) continue;

    const mktMatch = raw.match(/^MKT-(\d+)\s*(?:[•\-–])\s*(.*)$/i);
    let id, name;
    if (mktMatch) {
      const num = parseInt(mktMatch[1], 10);
      id = `MKT-${String(num).padStart(2, '0')}`;
      name = mktMatch[2]?.trim() || `Marketer ${num}`;
      if (num >= nextSeq) nextSeq = num + 1;
    } else {
      id = `MKT-${String(nextSeq).padStart(2, '0')}`;
      name = raw;
      nextSeq++;
    }

    seenNames.add(name.toLowerCase());
    marketers.push({
      id,
      name,
      phone: '',
      segment: prefix.includes('wadaana') ? 'Wadaana B2B' : '19L / PET'
    });
  }

  const initialRegistry = { nextMarketerSeq: nextSeq, marketers };
  try {
    await prisma[`${prefix}TenantSetting`].upsert({
      where: { key: 'MARKETERS_REGISTRY' },
      update: { value: initialRegistry },
      create: { key: 'MARKETERS_REGISTRY', value: initialRegistry }
    });
  } catch (e) {
    console.error('Failed to initialize MARKETERS_REGISTRY:', e);
  }
  return initialRegistry;
}

/** Helper to ensure a marketer exists in MARKETERS_REGISTRY, creating it if needed */
export async function ensureMarketerInRegistry(prefix, marketerId, marketerName) {
  if (!marketerName && !marketerId) return { marketerId: 'DIRECT', marketerName: 'Direct / Company' };
  if (marketerId === 'DIRECT' || marketerName?.toLowerCase() === 'direct') {
    return { marketerId: 'DIRECT', marketerName: 'Direct / Company' };
  }

  const registry = await getMarketersRegistry(prefix);
  let existing = null;
  if (marketerId && marketerId.startsWith('MKT-')) {
    existing = registry.marketers.find(m => m.id.toUpperCase() === marketerId.toUpperCase());
  }
  if (!existing && marketerName) {
    existing = registry.marketers.find(m => m.name.toLowerCase() === marketerName.trim().toLowerCase());
  }

  if (existing) {
    return { marketerId: existing.id, marketerName: existing.name };
  }

  // Auto-register brand new marketer
  const newId = marketerId && marketerId.startsWith('MKT-')
    ? marketerId
    : `MKT-${String(registry.nextMarketerSeq || (registry.marketers.length + 1)).padStart(2, '0')}`;
  const newName = marketerName?.trim() || `Marketer ${newId}`;

  const newMarketer = {
    id: newId,
    name: newName,
    phone: '',
    segment: prefix.includes('wadaana') ? 'Wadaana B2B' : '19L / PET'
  };

  const nextSeq = Math.max((registry.nextMarketerSeq || 1) + 1, (parseInt(newId.replace(/\D/g, ''), 10) || 1) + 1);
  registry.marketers.push(newMarketer);
  registry.nextMarketerSeq = nextSeq;

  try {
    await prisma[`${prefix}TenantSetting`].upsert({
      where: { key: 'MARKETERS_REGISTRY' },
      update: { value: registry },
      create: { key: 'MARKETERS_REGISTRY', value: registry }
    });
  } catch (e) {
    console.error('Failed to update MARKETERS_REGISTRY:', e);
  }

  return { marketerId: newId, marketerName: newName };
}

/** Formats a customer's marketer attribution metadata */
export function formatCustomerMarketer(c, registryMarketers = []) {
  const raw = (c.marketerRef || '').trim();
  if (!raw || raw.toLowerCase() === 'direct' || raw === 'DIRECT') {
    return {
      marketerId: 'DIRECT',
      marketerName: 'Direct / Company',
      marketerDisplay: 'Direct / Company'
    };
  }

  // Matches "MKT-01 • Ali Raza" or "MKT-01 - Ali"
  const mktMatch = raw.match(/^(MKT-\d+)(?:\s*[•\-–]\s*(.*))?$/i);
  if (mktMatch) {
    const id = mktMatch[1].toUpperCase();
    const parsedName = mktMatch[2]?.trim();
    const found = registryMarketers.find(m => m.id.toUpperCase() === id);
    const name = parsedName || found?.name || id;
    return {
      marketerId: id,
      marketerName: name,
      marketerDisplay: `${id} • ${name}`
    };
  }

  // Matches single name e.g. "Aslam"
  const found = registryMarketers.find(m => m.name.toLowerCase() === raw.toLowerCase());
  if (found) {
    return {
      marketerId: found.id,
      marketerName: found.name,
      marketerDisplay: `${found.id} • ${found.name}`
    };
  }

  return {
    marketerId: 'DIRECT',
    marketerName: raw,
    marketerDisplay: raw
  };
}

/** Retrieves registered marketers with aggregated customer count and outstanding debt */
export const getMarketers = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const registry = await getMarketersRegistry(prefix);

  const customers = await prisma[`${prefix}Customer`].findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      customerCode: true,
      name: true,
      marketerRef: true,
      currentBalance: true
    }
  });

  const marketersWithStats = registry.marketers.map(m => {
    const assignedCustomers = customers.filter(c => {
      const { marketerId, marketerName } = formatCustomerMarketer(c, registry.marketers);
      return marketerId === m.id || (m.name && marketerName.toLowerCase() === m.name.toLowerCase());
    });

    const totalDebt = assignedCustomers.reduce((acc, c) => acc + Number(c.currentBalance || 0), 0);
    const customerCodes = assignedCustomers.map(c => c.customerCode || `#${c.id.slice(0, 6)}`);

    return {
      ...m,
      customersCount: assignedCustomers.length,
      totalDebt,
      customerCodes
    };
  });

  const directCustomers = customers.filter(c => {
    const { marketerId } = formatCustomerMarketer(c, registry.marketers);
    return marketerId === 'DIRECT';
  });

  return sendSuccess(res, {
    marketers: marketersWithStats,
    directStats: {
      customersCount: directCustomers.length,
      totalDebt: directCustomers.reduce((acc, c) => acc + Number(c.currentBalance || 0), 0)
    }
  });
});

/** Creates and registers a new marketer */
export const createMarketer = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { name, phone, segment } = req.body;
  if (!name || !name.trim()) throw new ApiError(400, 'Marketer name is required');

  const registry = await getMarketersRegistry(prefix);
  const trimmedName = name.trim();

  const existing = registry.marketers.find(m => m.name.toLowerCase() === trimmedName.toLowerCase());
  if (existing) {
    return sendSuccess(res, existing, 200, { message: 'Marketer already registered' });
  }

  const nextSeq = registry.nextMarketerSeq || (registry.marketers.length + 1);
  const id = `MKT-${String(nextSeq).padStart(2, '0')}`;
  const newMarketer = {
    id,
    name: trimmedName,
    phone: phone ? phone.trim() : '',
    segment: segment ? segment.trim() : (prefix.includes('wadaana') ? 'Wadaana B2B' : '19L / PET')
  };

  registry.marketers.push(newMarketer);
  registry.nextMarketerSeq = nextSeq + 1;

  await prisma[`${prefix}TenantSetting`].upsert({
    where: { key: 'MARKETERS_REGISTRY' },
    update: { value: registry },
    create: { key: 'MARKETERS_REGISTRY', value: registry }
  });

  await createAuditLog(prefix, {
    action: 'MARKETER_CREATED',
    entityType: 'Marketer',
    entityId: id,
    performedBy: req.user?.name || req.user?.id || 'Admin',
    details: `Marketer Registered: ${id} • ${trimmedName} (${newMarketer.segment})`
  });

  return sendSuccess(res, newMarketer, 201);
});

/** Retrieves customers with optional search filtering */
export const getCustomers = asyncHandler(async (req, res) => {
  const { search, status, page, limit } = req.query;
  const prefix = getTenantPrefix(req);

  let archivedFilter = { archivedAt: null };
  if (status === 'archived') archivedFilter = { archivedAt: { not: null } };
  else if (status === 'all') archivedFilter = {};

  const q = search ? search.trim() : '';
  const where = q ? {
    ...archivedFilter,
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { address: { contains: q, mode: 'insensitive' } },
      { customerCode: { contains: q, mode: 'insensitive' } },
      { marketerRef: { contains: q, mode: 'insensitive' } }
    ]
  } : archivedFilter;

  const hasExplicitLimit = limit !== undefined && limit !== '' && limit !== 'all';
  const registry = await getMarketersRegistry(prefix);

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

    const custodyEnriched = await attachReturnableCustodyToCustomers(prisma, prefix, customers);

    const enriched = custodyEnriched.map(c => ({
      ...c,
      ...formatCustomerMarketer(c, registry.marketers)
    }));

    return sendSuccess(res, enriched, 200, {
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

  const custodyEnriched = await attachReturnableCustodyToCustomers(prisma, prefix, customers);

  const enriched = custodyEnriched.map(c => ({
    ...c,
    ...formatCustomerMarketer(c, registry.marketers)
  }));

  return sendSuccess(res, enriched);
});

/** Batch attaches returnable custody breakdown to customers without N+1 queries */
async function attachReturnableCustodyToCustomers(prismaClient, prefix, customers) {
  const returnableItems = await getAllReturnableRawMaterials(prismaClient, prefix);
  const returnableMap = new Map(returnableItems.map(item => [item.id, item]));
  const defaultReturnable = returnableItems[0] || null;

  const customerIdsWithCustody = customers
    .filter(c => Number(c.cachedBottleBalance || 0) > 0)
    .map(c => c.id);

  const custodyByCustomer = new Map();

  if (customerIdsWithCustody.length > 0) {
    let txGroups;
    try {
      txGroups = await prismaClient[`${prefix}BottleTransaction`].groupBy({
        by: ['customerId', 'itemId', 'type'],
        where: { customerId: { in: customerIdsWithCustody } },
        _sum: { quantity: true }
      });
    } catch (_err) {
      txGroups = await prismaClient[`${prefix}BottleTransaction`].groupBy({
        by: ['customerId', 'type'],
        where: { customerId: { in: customerIdsWithCustody } },
        _sum: { quantity: true }
      });
    }

    for (const row of txGroups) {
      const cid = row.customerId;
      const resolvedId = row.itemId || defaultReturnable?.id || 'DEFAULT_19L';
      const itemMeta = returnableMap.get(resolvedId) || defaultReturnable || {
        id: resolvedId,
        name: 'Empty 19L Bottles',
        unit: 'bottle'
      };

      if (!custodyByCustomer.has(cid)) {
        custodyByCustomer.set(cid, new Map());
      }
      const custItemMap = custodyByCustomer.get(cid);
      if (!custItemMap.has(resolvedId)) {
        custItemMap.set(resolvedId, {
          itemId: itemMeta.id,
          name: itemMeta.name,
          unit: itemMeta.unit || 'bottle',
          inCustody: 0
        });
      }

      const entry = custItemMap.get(resolvedId);
      const qty = Number(row._sum?.quantity || 0);
      if (row.type === 'DELIVERED_TO_CUSTOMER') entry.inCustody += qty;
      else if (['RETURNED_GOOD', 'RETURNED_BROKEN', 'MARKED_LOST'].includes(row.type)) {
        entry.inCustody -= qty;
      }
    }
  }

  return customers.map(c => {
    const itemMap = custodyByCustomer.get(c.id);
    const returnableCustody = itemMap
      ? Array.from(itemMap.values()).map(e => {
          const custody = Math.max(0, e.inCustody);
          return { ...e, inCustody: custody, balance: custody, itemName: e.name };
        }).filter(entry => entry.inCustody > 0)
      : [];

    const balance = Number(c.cachedBottleBalance || 0);
    const sumCustody = returnableCustody.reduce((s, e) => s + e.inCustody, 0);
    if (balance > sumCustody) {
      const primaryName = defaultReturnable?.name || 'Empty 19L Bottles';
      const primaryId = defaultReturnable?.id || 'DEFAULT_19L';
      const existing = returnableCustody.find(ri => ri.itemId === primaryId);
      const diff = balance - sumCustody;
      if (existing) {
        existing.inCustody += diff;
        existing.balance = existing.inCustody;
      } else {
        returnableCustody.unshift({
          itemId: primaryId,
          name: primaryName,
          itemName: primaryName,
          unit: defaultReturnable?.unit || 'bottle',
          inCustody: diff,
          balance: diff
        });
      }
    }

    return {
      ...c,
      returnableCustody
    };
  });
}

/** Retrieves detailed customer history */
export const getCustomerDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  const [customer, auditLogs, registry] = await Promise.all([
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
          select: {
            id: true,
            type: true,
            quantity: true,
            reason: true,
            runningBalance: true,
            createdAt: true,
            itemId: true,
            item: { select: { id: true, name: true, unit: true, isReturnable: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          select: { id: true, amount: true, type: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        },
        spotSales: {
          include: {
            items: { include: { item: { select: { id: true, name: true, unit: true } } } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    }),
    prisma[`${prefix}AuditLog`].findMany({
      where: { entityType: 'Customer', entityId: id },
      orderBy: { createdAt: 'desc' }
    }),
    getMarketersRegistry(prefix)
  ]);

  if (!customer) throw new ApiError(404, 'Customer not found');
  const marketerMeta = formatCustomerMarketer(customer, registry.marketers);
  const returnableCustody = await getCustomerReturnableCustodyBreakdown(prisma, prefix, id, Number(customer.cachedBottleBalance || 0));
  return sendSuccess(res, { ...customer, ...marketerMeta, returnableCustody, auditLogs });
});

/** Creates a new customer or restores archived record */
export const createCustomer = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { name, phone, type, address, mapLink, securityDeposit, currentBalance, creditDuration, remarks, homePictureUrl, marketerRef, marketerId, marketerName, buyerNtn, buyerStrn } = req.body;

  if (!name || !phone || !type) throw new ApiError(400, 'Name, phone, and type required');
  if (mapLink && !isValidGoogleMapsUrl(mapLink)) {
    throw new ApiError(400, 'Invalid Google Maps URL');
  }

  // Calculate next sequential Customer ID
  const codePrefix = prefix === 'wadaana' ? 'WAD313' : 'JAM313';
  const getNextCustomerCode = async () => {
    const existingWithCode = await prisma[`${prefix}Customer`].findMany({
      where: { customerCode: { not: null } },
      select: { customerCode: true }
    });
    let maxSeq = 0;
    existingWithCode.forEach(c => {
      const match = c.customerCode?.match(new RegExp(`${codePrefix}(\\d+)`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    });
    return `${codePrefix}${String(maxSeq + 1).padStart(4, '0')}`;
  };

  const customerCode = await getNextCustomerCode();

  // Resolve marketer attribution
  let resolvedMarketerRef = null;
  if (marketerId === 'DIRECT' || (marketerRef && marketerRef.trim().toLowerCase() === 'direct')) {
    resolvedMarketerRef = null;
  } else if (marketerId && marketerId.startsWith('MKT-')) {
    const regRes = await ensureMarketerInRegistry(prefix, marketerId, marketerName || marketerRef);
    resolvedMarketerRef = `${regRes.marketerId} • ${regRes.marketerName}`;
  } else if (marketerName && marketerName.trim()) {
    const regRes = await ensureMarketerInRegistry(prefix, null, marketerName.trim());
    resolvedMarketerRef = `${regRes.marketerId} • ${regRes.marketerName}`;
  } else if (marketerRef && marketerRef.trim()) {
    const regRes = await ensureMarketerInRegistry(prefix, null, marketerRef.trim());
    resolvedMarketerRef = `${regRes.marketerId} • ${regRes.marketerName}`;
  }

  const cleanPhone = normalizePakistanPhone(phone);
  const openingBottles = Math.max(0, parseInt(req.body.cachedBottleBalance || 0, 10) || 0);

  const customerData = {
    name: name.trim(),
    phone: cleanPhone || phone.trim(),
    customerCode,
    marketerRef: resolvedMarketerRef,
    buyerNtn: buyerNtn ? buyerNtn.trim() : null,
    buyerStrn: buyerStrn ? buyerStrn.trim() : null,
    type,
    address: address || null,
    mapLink: mapLink ? sanitizeGoogleMapsUrl(mapLink) : null,
    deposit: securityDeposit ? parseInt(securityDeposit, 10) : 0,
    currentBalance: currentBalance ? parseFloat(currentBalance) : 0.0,
    cachedBottleBalance: openingBottles,
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

  let customer;
  if (archivedCustomer) {
    customer = await prisma[`${prefix}Customer`].update({ where: { id: archivedCustomer.id }, data: customerData });
  } else {
    try {
      customer = await prisma[`${prefix}Customer`].create({ data: customerData });
    } catch (createErr) {
      if (createErr.code === 'P2002' && createErr.meta?.target?.includes('customer_code')) {
        customerData.customerCode = await getNextCustomerCode();
        customer = await prisma[`${prefix}Customer`].create({ data: customerData });
      } else {
        throw createErr;
      }
    }
  }

  // If opening returnable bottles were provided, log opening BottleTransaction
  if (openingBottles > 0) {
    try {
      const primaryReturnable = await resolveReturnableRawMaterial(prisma, prefix);
      await prisma[`${prefix}BottleTransaction`].create({
        data: {
          customerId: customer.id,
          itemId: primaryReturnable?.id || null,
          type: 'DELIVERED_TO_CUSTOMER',
          quantity: openingBottles,
          reason: 'Opening Custody Balance'
        }
      });
    } catch (btErr) {
      console.error('Failed to log opening custody BottleTransaction:', btErr);
    }
  }

  await createAuditLog(prefix, {
    action: 'CUSTOMER_CREATED',
    entityType: 'Customer',
    entityId: customer.id,
    performedBy: req.user?.name || req.user?.id || 'Admin',
    details: `Customer Created: ${customer.name} (${customer.phone}) - Type: ${customer.type}`
  });

  broadcastEvent(prefix, 'CUSTOMER_UPDATED', { customerId: customer.id });
  const registry = await getMarketersRegistry(prefix);
  const marketerMeta = formatCustomerMarketer(customer, registry.marketers);
  return sendSuccess(res, { ...customer, ...marketerMeta }, 201);
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

  // Marketer reference update
  if (req.body.marketerId !== undefined || req.body.marketerName !== undefined || req.body.marketerRef !== undefined) {
    const inputMarketerId = req.body.marketerId;
    const inputMarketerName = req.body.marketerName;
    const inputMarketerRef = req.body.marketerRef;

    if (inputMarketerId === 'DIRECT' || (inputMarketerRef && inputMarketerRef.trim().toLowerCase() === 'direct')) {
      updateData.marketerRef = null;
    } else if (inputMarketerId && inputMarketerId.startsWith('MKT-')) {
      const regRes = await ensureMarketerInRegistry(prefix, inputMarketerId, inputMarketerName);
      updateData.marketerRef = `${regRes.marketerId} • ${regRes.marketerName}`;
    } else if (inputMarketerName && inputMarketerName.trim()) {
      const regRes = await ensureMarketerInRegistry(prefix, null, inputMarketerName.trim());
      updateData.marketerRef = `${regRes.marketerId} • ${regRes.marketerName}`;
    } else if (inputMarketerRef && inputMarketerRef.trim()) {
      const regRes = await ensureMarketerInRegistry(prefix, null, inputMarketerRef.trim());
      updateData.marketerRef = `${regRes.marketerId} • ${regRes.marketerName}`;
    } else {
      updateData.marketerRef = null;
    }
  }

  if (req.body.buyerNtn !== undefined) updateData.buyerNtn = req.body.buyerNtn ? req.body.buyerNtn.trim() : null;
  if (req.body.buyerStrn !== undefined) updateData.buyerStrn = req.body.buyerStrn ? req.body.buyerStrn.trim() : null;

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
  const registry = await getMarketersRegistry(prefix);
  const marketerMeta = formatCustomerMarketer(customer, registry.marketers);
  return sendSuccess(res, { ...customer, ...marketerMeta });
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
          await debitEmptyBottlesFromFactory(tx, prefix, {
            quantity: retGoodTotal,
            customerId: id,
            orderId: ord.id,
            reason: 'CUSTOMER_DELETED_EMPTY_BOTTLE_REVERSAL',
            skipTransactionLog: true
          });
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

    // 2. Clean up spot sales for this customer with symmetrical stock restoration
    for (const ss of customer.spotSales) {
      const saleRefs = [ss.saleNumber, ss.id].filter(Boolean);
      const productOutTxs = saleRefs.length > 0
        ? await tx[`${prefix}InventoryTransaction`].findMany({
            where: {
              refType: 'SPOT_SALE',
              refId: { in: saleRefs },
              direction: 'OUT'
            }
          })
        : [];

      for (const outTx of productOutTxs) {
        const q = Number(outTx.quantity || 0);
        if (q <= 0 || !outTx.itemId) continue;
        const isWarehouse = outTx.location === 'WAREHOUSE';
        await tx[`${prefix}Item`].update({
          where: { id: outTx.itemId },
          data: {
            cachedQty: { increment: q },
            ...(isWarehouse ? { warehouseQty: { increment: q } } : { factoryQty: { increment: q } })
          }
        }).catch(() => null);
      }

      if (saleRefs.length > 0) {
        const exactReasons = [];
        if (ss.saleNumber) {
          exactReasons.push(`Counter Sale (${ss.saleNumber})`);
          exactReasons.push(`Counter Sale Empty Return (${ss.saleNumber})`);
        }
        if (ss.id) {
          exactReasons.push(`Counter Sale (${ss.id})`);
          exactReasons.push(`Counter Sale Empty Return (${ss.id})`);
        }

        const bottlePredicate = {
          customerId: id,
          OR: [
            { reason: { in: exactReasons } },
            ...saleRefs.map(ref => ({ reason: { startsWith: `Counter Sale Empty Return (${ref})` } })),
            ...saleRefs.map(ref => ({ reason: { startsWith: `Counter Sale (${ref})` } }))
          ]
        };

        // Revert returnable empty bottles from factory stock
        const existingBottleTxs = await tx[`${prefix}BottleTransaction`].findMany({
          where: bottlePredicate
        });

        for (const bTx of existingBottleTxs) {
          const q = Number(bTx.quantity || 0);
          if (bTx.type === 'RETURNED_GOOD' && q > 0) {
            await debitEmptyBottlesFromFactory(tx, prefix, {
              quantity: q,
              rawMaterialId: bTx.itemId,
              customerId: id,
              reason: `CUSTOMER_DELETED_SPOT_SALE_BOTTLE_REVERSAL (${ss.saleNumber || ss.id})`,
              skipTransactionLog: true
            });
          }
        }

        await tx[`${prefix}InventoryTransaction`].deleteMany({
          where: { refType: 'SPOT_SALE', refId: { in: saleRefs } }
        });
        await tx[`${prefix}BottleTransaction`].deleteMany({
          where: bottlePredicate
        });
      }

      await tx[`${prefix}SpotSaleItem`].deleteMany({ where: { spotSaleId: ss.id } });
      await tx[`${prefix}SpotSale`].delete({ where: { id: ss.id } });
    }

    // 3. Clean up any remaining bottle transactions for this customer
    await tx[`${prefix}BottleTransaction`].deleteMany({ where: { customerId: id } });

    // 4. Clean up payments for this customer
    await tx[`${prefix}Payment`].deleteMany({ where: { customerId: id } });

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

/**
 * Settles customer lump-sum payment across open Orders and SpotSales using FIFO chronological order.
 */
export const settleCustomerLumpSumPayment = asyncHandler(async (req, res) => {
  const { id: customerId } = req.params;
  const prefix = getTenantPrefix(req);
  const { amount = 0, paymentMethod = 'CASH', settleFromSecurity = false, remarks = '' } = req.body;

  const cash = parseFloat(amount || 0);
  const normMethod = String(paymentMethod || 'CASH').toUpperCase();
  const validPaymentTypes = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'SECURITY_DEPOSIT', 'EASYPAISA', 'JAZZCASH'];
  const safePaymentType = validPaymentTypes.includes(normMethod) ? normMethod : 'BANK_TRANSFER';

  if ((isNaN(cash) || cash <= 0) && !settleFromSecurity) {
    throw new ApiError(400, 'Payment amount must be greater than 0');
  }

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx[`${prefix}Customer`].findUnique({
      where: { id: customerId }
    });
    if (!customer) throw new ApiError(404, 'Customer not found');

    // Fetch all non-cancelled unpaid/partial orders and unpaid spot sales oldest-first (FIFO)
    const [openOrders, openSpotSales] = await Promise.all([
      tx[`${prefix}Order`].findMany({
        where: {
          customerId,
          deliveryStatus: { not: 'CANCELLED' },
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] }
        },
        include: { items: true, payments: true },
        orderBy: { createdAt: 'asc' }
      }),
      tx[`${prefix}SpotSale`].findMany({
        where: {
          customerId,
          OR: [{ debtAmount: { gt: 0 } }, { creditAmount: { gt: 0 } }]
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    // Build unified chronological FIFO pool of all unpaid Orders + SpotSales
    const obligations = [];
    for (const ord of openOrders) {
      const sub = (ord.items || []).reduce((s, i) => s + (parseFloat(i.price || 0) * Number(i.quantity || 0)), 0);
      const ordTotal = ord.withGst ? sub + Math.round(sub * 0.18) : sub;
      const ordPaid = (ord.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
      const ordDue = Math.max(0, ordTotal - ordPaid);
      if (ordDue > 0) {
        obligations.push({ kind: 'ORDER', record: ord, total: ordTotal, paid: ordPaid, due: ordDue, createdAt: new Date(ord.createdAt) });
      }
    }
    for (const ss of openSpotSales) {
      const ssDue = Math.max(0, Number(ss.debtAmount || ss.creditAmount || 0));
      if (ssDue > 0) {
        obligations.push({ kind: 'SPOT_SALE', record: ss, due: ssDue, createdAt: new Date(ss.createdAt) });
      }
    }
    obligations.sort((a, b) => a.createdAt - b.createdAt);

    const totalObligationsDue = obligations.reduce((s, o) => s + o.due, 0);
    const currentCustomerDebt = Math.max(Number(customer.currentBalance || 0), totalObligationsDue);

    const availableDeposit = Math.max(0, Number(customer.deposit || 0));
    const depositToApply = settleFromSecurity ? Math.min(availableDeposit, currentCustomerDebt) : 0;
    
    let remainingDepositPool = depositToApply;
    let remainingCashPool = cash;
    let remainingPool = remainingDepositPool + remainingCashPool;

    if (remainingPool <= 0) {
      throw new ApiError(400, 'No payment or security deposit available to apply');
    }

    const settledOrders = [];
    const settledSpotSales = [];

    for (const ob of obligations) {
      if (remainingPool <= 0) break;
      const alloc = Math.min(remainingPool, ob.due);
      if (alloc <= 0) continue;

      let allocDeposit = 0;
      let allocCash = 0;
      if (remainingDepositPool > 0) {
        allocDeposit = Math.min(remainingDepositPool, alloc);
        remainingDepositPool -= allocDeposit;
      }
      const needCash = alloc - allocDeposit;
      if (needCash > 0 && remainingCashPool > 0) {
        allocCash = Math.min(remainingCashPool, needCash);
        remainingCashPool -= allocCash;
      }

      if (ob.kind === 'ORDER') {
        const ord = ob.record;
        const newPaid = ob.paid + alloc;
        const newStatus = newPaid >= ob.total ? 'PAID' : 'PARTIAL';

        if (allocDeposit > 0) {
          await tx[`${prefix}Payment`].create({
            data: {
              orderId: ord.id,
              customerId,
              amount: allocDeposit,
              type: 'SECURITY_DEPOSIT'
            }
          });
        }
        if (allocCash > 0) {
          await tx[`${prefix}Payment`].create({
            data: {
              orderId: ord.id,
              customerId,
              amount: allocCash,
              type: safePaymentType
            }
          });
        }

        await tx[`${prefix}Order`].update({
          where: { id: ord.id },
          data: { paymentStatus: newStatus }
        });

        settledOrders.push({ id: ord.id, allocated: alloc, newStatus });
      } else if (ob.kind === 'SPOT_SALE') {
        const ss = ob.record;
        const newDebt = Math.max(0, ob.due - alloc);

        await tx[`${prefix}SpotSale`].update({
          where: { id: ss.id },
          data: {
            debtAmount: newDebt,
            creditAmount: newDebt,
            remarks: `${ss.remarks ? ss.remarks + ' | ' : ''}Settled Rs. ${alloc} (${normMethod})`
          }
        });

        if (allocDeposit > 0) {
          await tx[`${prefix}Payment`].create({
            data: {
              orderId: null,
              customerId,
              amount: allocDeposit,
              type: 'SECURITY_DEPOSIT'
            }
          });
        }
        if (allocCash > 0) {
          await tx[`${prefix}Payment`].create({
            data: {
              orderId: null,
              customerId,
              amount: allocCash,
              type: safePaymentType
            }
          });
        }

        settledSpotSales.push({ id: ss.id, saleNumber: ss.saleNumber, allocated: alloc, remainingDebt: newDebt });
      }

      remainingPool = remainingDepositPool + remainingCashPool;
    }

    if (remainingCashPool > 0) {
      await tx[`${prefix}Payment`].create({
        data: {
          orderId: null,
          customerId,
          amount: remainingCashPool,
          type: safePaymentType
        }
      });
    }

    const totalApplied = cash + depositToApply;
    const newCustomerBalance = Math.max(0, currentCustomerDebt - totalApplied);

    const updatedCustomer = await tx[`${prefix}Customer`].update({
      where: { id: customerId },
      data: {
        currentBalance: newCustomerBalance,
        ...(depositToApply > 0 ? { deposit: { decrement: depositToApply } } : {})
      }
    });

    await createAuditLog(prefix, {
      action: 'CUSTOMER_DEBT_SETTLED',
      entityType: 'Customer',
      entityId: customerId,
      performedBy: req.user?.name || req.user?.id || 'Staff',
      details: JSON.stringify({
        amountPaid: cash,
        depositApplied: depositToApply,
        paymentMethod: normMethod,
        previousDebt: currentCustomerDebt,
        newBalance: newCustomerBalance,
        settledOrdersCount: settledOrders.length,
        settledSpotSalesCount: settledSpotSales.length,
        settledOrders,
        settledSpotSales,
        remarks
      })
    });

    return { customer: updatedCustomer, settledOrders, settledSpotSales, newCustomerBalance };
  }, { maxWait: 10000, timeout: 30000 });

  broadcastDashboardUpdate(prefix);
  broadcastEvent(prefix, 'CUSTOMER_UPDATED', { customerId });
  broadcastEvent(prefix, 'ORDER_UPDATED');
  broadcastEvent(prefix, 'COUNTER_SALE_CREATED');
  return sendSuccess(res, result, 200, { message: 'Customer debt settled successfully' });
});

/**
 * GET /api/v1/customers/csv-template
 * Downloads a tenant-aware sample CSV template (OWNER only)
 */
export const downloadCustomerCsvTemplate = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only the Owner can download or use the bulk customer CSV template');
  }
  const prefix = getTenantPrefix(req);
  const isWadaana = prefix === 'wadaana';

  const registry = await getMarketersRegistry(prefix);
  const sampleMarketer = registry.marketers.length > 0
    ? `${registry.marketers[0].id} • ${registry.marketers[0].name}`
    : 'Tariq Mehmood';

  const csvContent = isWadaana
    ? [
        'name,phone,type,address,mapLink,securityDeposit,currentBalance,creditDuration,marketerRef,qtyPure05L,qtyPure15L,qtyMix05L,qtyMix15L,qtyPureFine05L,qtyPureFine15L,buyerNtn,buyerStrn,remarks',
        `"Khyber Beverages Wholesale","03005556677","Distributor","Industrial Estate, Hattar","",0,25000,15,"${sampleMarketer}",1000,500,2000,1000,0,0,"7654321-0","12-34-5678-901-23","B2B Preform Distributor"`,
        '"Shaheen Traders","03458889900","Commercial","Circular Road, Abbottabad","",0,0,7,"DIRECT",0,0,500,500,200,200,"","","Weekly preform dispatch"'
      ].join('\n')
    : [
        'name,phone,type,address,mapLink,securityDeposit,currentBalance,cachedBottleBalance,creditDuration,marketerRef,qty19L,qty05LPet,qty15LPet,buyerNtn,buyerStrn,remarks',
        `"Al-Madina Cash & Carry","03005123456","Commercial","Main GT Road, Hassan Abdal","https://maps.google.com/?q=33.823,72.689",3000,1500,3,7,"${sampleMarketer}",5,10,5,"1234567-8","","Deliver every Tuesday & Friday"`,
        '"Dr. Kamran Clinic","03219876543","Corporate","Street 4, Cantt Area","",2000,0,2,14,"DIRECT",2,0,0,"","","Morning delivery before 11 AM"'
      ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${prefix}_customers_template.csv"`);
  return res.status(200).send('\uFEFF' + csvContent);
});

/**
 * POST /api/v1/customers/bulk-import
 * Bulk imports customers from CSV file or parsed JSON rows (Strictly OWNER only)
 */
export const bulkImportCustomers = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only the Owner is authorized to bulk import customers via CSV');
  }

  const prefix = getTenantPrefix(req);
  const codePrefix = prefix === 'wadaana' ? 'WAD313' : 'JAM313';

  let rawRows;
  if (req.file && req.file.buffer) {
    const csvText = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim()
    });
    rawRows = parsed.data || [];
  } else if (Array.isArray(req.body?.rows)) {
    rawRows = req.body.rows;
  } else if (typeof req.body?.csvText === 'string') {
    const parsed = Papa.parse(req.body.csvText.replace(/^\uFEFF/, ''), {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim()
    });
    rawRows = parsed.data || [];
  } else {
    throw new ApiError(400, 'Please provide a valid CSV file or rows array');
  }

  if (rawRows.length === 0) {
    throw new ApiError(400, 'The uploaded CSV file contains no customer rows');
  }
  if (rawRows.length > 2000) {
    throw new ApiError(400, 'Maximum 2,000 customers can be imported in a single batch');
  }

  // Load existing customers to check phone duplicates and highest sequential customerCode
  const existingCustomers = await prisma[`${prefix}Customer`].findMany({
    select: { id: true, phone: true, customerCode: true, archivedAt: true }
  });

  const activePhoneSet = new Set();
  const archivedPhoneMap = new Map();
  let maxSeq = 0;

  for (const c of existingCustomers) {
    const match = c.customerCode?.match(new RegExp(`${codePrefix}(\\d+)`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
    const cleanP = normalizePakistanPhone(c.phone?.includes('_archived_') ? c.phone.split('_archived_')[0] : c.phone);
    if (c.archivedAt) {
      if (cleanP) archivedPhoneMap.set(cleanP, c.id);
    } else if (cleanP) {
      activePhoneSet.add(cleanP);
      activePhoneSet.add(c.phone.trim());
    }
  }

  const seenInCsv = new Set();
  const validPayloads = [];
  const skippedRows = [];

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const rowNumber = i + 2; // 1-indexed + header row
    const name = String(r.name || r.Name || r.customer_name || r['Customer Name'] || '').trim();
    const rawPhone = String(r.phone || r.Phone || r.mobile || r['Phone Number'] || '').trim();
    const phone = normalizePakistanPhone(rawPhone);

    if (!name) {
      skippedRows.push({ row: rowNumber, name: '—', phone: rawPhone, reason: 'Missing customer name' });
      continue;
    }
    if (!phone || phone.length < 7) {
      skippedRows.push({ row: rowNumber, name, phone: rawPhone, reason: `Invalid phone number "${rawPhone}"` });
      continue;
    }
    if (seenInCsv.has(phone)) {
      skippedRows.push({ row: rowNumber, name, phone, reason: 'Duplicate phone number inside this CSV file' });
      continue;
    }
    if (activePhoneSet.has(phone) || activePhoneSet.has(rawPhone)) {
      skippedRows.push({ row: rowNumber, name, phone, reason: 'Customer with this phone already exists in database' });
      continue;
    }

    const rawMapLink = String(r.mapLink || r.map_link || r['Google Maps Link'] || '').trim();
    if (rawMapLink && !isValidGoogleMapsUrl(rawMapLink)) {
      skippedRows.push({ row: rowNumber, name, phone, reason: 'Invalid Google Maps URL format' });
      continue;
    }

    seenInCsv.add(phone);

    // Resolve marketer attribution
    const rawMarketer = String(r.marketerRef || r.marketer || r['Marketer Name'] || '').trim();
    let resolvedMarketerRef = null;
    if (rawMarketer && rawMarketer.toLowerCase() !== 'direct') {
      const mktMatch = rawMarketer.match(/^(MKT-\d+)(?:\s*[•\-–]\s*(.*))?$/i);
      if (mktMatch) {
        const regRes = await ensureMarketerInRegistry(prefix, mktMatch[1].toUpperCase(), mktMatch[2]?.trim() || '');
        resolvedMarketerRef = `${regRes.marketerId} • ${regRes.marketerName}`;
      } else {
        const regRes = await ensureMarketerInRegistry(prefix, null, rawMarketer);
        resolvedMarketerRef = `${regRes.marketerId} • ${regRes.marketerName}`;
      }
    }

    maxSeq++;
    const customerCode = `${codePrefix}${String(maxSeq).padStart(4, '0')}`;

    const q19 = Math.max(0, parseInt(r.qty19L || 0, 10) || 0);
    const q05 = Math.max(0, parseInt(r.qty05LPet || 0, 10) || 0);
    const q15 = Math.max(0, parseInt(r.qty15LPet || 0, 10) || 0);

    const qp05 = Math.max(0, parseInt(r.qtyPure05L || 0, 10) || 0);
    const qp15 = Math.max(0, parseInt(r.qtyPure15L || 0, 10) || 0);
    const qm05 = Math.max(0, parseInt(r.qtyMix05L || 0, 10) || 0);
    const qm15 = Math.max(0, parseInt(r.qtyMix15L || 0, 10) || 0);
    const qpf05 = Math.max(0, parseInt(r.qtyPureFine05L || 0, 10) || 0);
    const qpf15 = Math.max(0, parseInt(r.qtyPureFine15L || 0, 10) || 0);

    const tenantProducts = prefix === 'aquasphere'
      ? {
          buys19L: parseBoolCsv(r.buys19L) || q19 > 0,
          qty19L: q19,
          buys05LPet: parseBoolCsv(r.buys05LPet) || q05 > 0,
          qty05LPet: q05,
          buys15LPet: parseBoolCsv(r.buys15LPet) || q15 > 0,
          qty15LPet: q15
        }
      : {
          buysPure05L: parseBoolCsv(r.buysPure05L) || qp05 > 0,
          qtyPure05L: qp05,
          buysPure15L: parseBoolCsv(r.buysPure15L) || qp15 > 0,
          qtyPure15L: qp15,
          buysMix05L: parseBoolCsv(r.buysMix05L) || qm05 > 0,
          qtyMix05L: qm05,
          buysMix15L: parseBoolCsv(r.buysMix15L) || qm15 > 0,
          qtyMix15L: qm15,
          buysPureFine05L: parseBoolCsv(r.buysPureFine05L) || qpf05 > 0,
          qtyPureFine05L: qpf05,
          buysPureFine15L: parseBoolCsv(r.buysPureFine15L) || qpf15 > 0,
          qtyPureFine15L: qpf15
        };

    const openingBottles = Math.max(0, parseInt(r.cachedBottleBalance || r.bottlesInCustody || 0, 10) || 0);

    validPayloads.push({
      archivedIdToRestore: archivedPhoneMap.get(phone) || null,
      data: {
        name,
        phone,
        customerCode,
        marketerRef: resolvedMarketerRef,
        buyerNtn: r.buyerNtn ? String(r.buyerNtn).trim() : null,
        buyerStrn: r.buyerStrn ? String(r.buyerStrn).trim() : null,
        type: normalizeCustomerType(r.type || r.Type),
        address: r.address ? String(r.address).trim() : null,
        mapLink: rawMapLink ? sanitizeGoogleMapsUrl(rawMapLink) : null,
        deposit: Math.max(0, parseInt(r.securityDeposit || r.deposit || 0, 10) || 0),
        currentBalance: Math.max(0, parseFloat(r.currentBalance || r.debt || 0) || 0),
        cachedBottleBalance: openingBottles,
        creditDuration: Math.max(1, parseInt(r.creditDuration || 7, 10) || 7),
        remarks: r.remarks ? String(r.remarks).trim() : null,
        archivedAt: null,
        ...tenantProducts
      }
    });
  }

  if (validPayloads.length === 0) {
    return sendSuccess(res, {
      importedCount: 0,
      skippedCount: skippedRows.length,
      skippedRows,
      importedCustomers: []
    }, 200, { message: 'No valid new customers to import. Check skipped rows for details.' });
  }

  const importedCustomers = await prisma.$transaction(async (tx) => {
    const primaryReturnable = await resolveReturnableRawMaterial(tx, prefix);
    const created = [];

    for (const item of validPayloads) {
      const cust = item.archivedIdToRestore
        ? await tx[`${prefix}Customer`].update({
            where: { id: item.archivedIdToRestore },
            data: item.data
          })
        : await tx[`${prefix}Customer`].create({
            data: item.data
          });

      // If customer has an opening bottle custody balance, record an opening BottleTransaction
      if (item.data.cachedBottleBalance > 0) {
        await tx[`${prefix}BottleTransaction`].create({
          data: {
            customerId: cust.id,
            itemId: primaryReturnable?.id || null,
            type: 'DELIVERED_TO_CUSTOMER',
            quantity: item.data.cachedBottleBalance,
            reason: 'CSV Bulk Import — Opening Custody Balance'
          }
        });
      }

      created.push(cust);
    }

    await createAuditLog(prefix, {
      action: 'CUSTOMERS_BULK_IMPORTED',
      entityType: 'Customer',
      entityId: 'BULK_CSV',
      performedBy: req.user?.name || req.user?.id || 'OWNER',
      details: `Bulk imported ${created.length} customers via CSV (${skippedRows.length} skipped)`
    });

    return created;
  }, { maxWait: 15000, timeout: 45000 });

  broadcastDashboardUpdate(prefix);
  broadcastEvent(prefix, 'CUSTOMER_UPDATED', { bulkImportedCount: importedCustomers.length });

  return sendSuccess(res, {
    importedCount: importedCustomers.length,
    skippedCount: skippedRows.length,
    skippedRows,
    importedCustomers
  }, 201, {
    message: `Successfully imported ${importedCustomers.length} customer(s)${skippedRows.length > 0 ? ` (${skippedRows.length} skipped)` : ''}`
  });
});


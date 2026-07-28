import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { Prisma } from '@prisma/client';

const getTenantPrefix = (req) => {
  const rawTenant = req.tenant || req.headers['x-company-context'] || req.headers['x-tenant'] || 'aquasphere';
  return rawTenant.toString().toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';
};

export const getOrders = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const orders = await prisma[`${prefix}Order`].findMany({
    include: { customer: true, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json({ success: true, data: orders });
});

export const createOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { customerId, type, items, expectedDelivery, remarks, paymentStatus, bypassCreditCheck } = req.body; 
  if (!customerId || !type || !items?.length) throw new ApiError(400, 'Invalid payload');

  const customer = await prisma[`${prefix}Customer`].findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  const orderTotal = items.reduce((sum, i) => sum + (parseFloat(i.price) * parseInt(i.quantity)), 0);

  // Credit limit soft-block check
  const currentBalance = parseFloat(customer.cachedBalance || 0);
  const limit = parseFloat(customer.creditLimit || 0);
  
  if (limit > 0 && (currentBalance + orderTotal > limit) && !bypassCreditCheck) {
    return res.status(200).json({
      success: false,
      softBlock: true,
      blockReason: 'CREDIT_LIMIT_EXCEEDED',
      message: `Order pushes customer over credit limit. Balance: ${currentBalance}, Order: ${orderTotal}, Limit: ${limit}. Proceed?`
    });
  }

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx[`${prefix}Order`].create({
      data: { 
        customerId, 
        type,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        remarks,
        paymentStatus: paymentStatus || 'UNPAID'
      }
    });

    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'Order',
        entityId: o.id,
        performedBy: req.user?.id || 'Unknown',
        details: JSON.stringify({ customerId, type, items: items.map(i => ({ itemId: i.itemId, quantity: i.quantity, price: i.price })) })
      }
    });

    return o;
  });

  res.status(201).json({ success: true, data: order });
});

export const updateOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { expectedDelivery, remarks } = req.body;

  const order = await prisma[`${prefix}Order`].findUnique({ where: { id } });
  if (!order) throw new ApiError(404, 'Order not found');
  
  if (order.deliveryStatus === 'DELIVERED') {
    throw new ApiError(400, 'Cannot edit a delivered order');
  }

  const updated = await prisma[`${prefix}Order`].update({
    where: { id },
    data: {
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      remarks
    }
  });

  res.json({ success: true, data: updated });
});

export const deliverOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { 
    qtyDelivered, 
    bottlesReturnedGood, 
    bottlesReturnedBroken, 
    qty05LDelivered,
    qty15LDelivered,
    cashReceived, 
    paymentMethod, 
    remarks,
    bypassBottleCheck
  } = req.body;

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx[`${prefix}Order`].findUnique({ where: { id }, include: { items: true, customer: true } });
    if (!o) throw new ApiError(404, 'Order not found');
    if (o.deliveryStatus === 'DELIVERED') throw new ApiError(400, 'Order is already delivered');

    const qty = parseInt(qtyDelivered || 0); // 19L delivered
    const retGood = parseInt(bottlesReturnedGood || 0);
    const retBroken = parseInt(bottlesReturnedBroken || 0);
    const q05 = parseInt(qty05LDelivered || 0);
    const q15 = parseInt(qty15LDelivered || 0);
    const cash = parseFloat(cashReceived || 0);
    const orderTotal = o.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

    // Soft-block check for bottle returns
    const currentBottles = o.customer.cachedBottleBalance || 0;
    if ((retGood + retBroken > currentBottles) && !bypassBottleCheck) {
      throw new ApiError(400, `SOFT_BLOCK_BOTTLES: Customer holds only ${currentBottles} bottles, but returning ${retGood + retBroken}. Proceed anyway?`);
    }

    await tx[`${prefix}Delivery`].create({
      data: {
        orderId: o.id,
        qtyDelivered: qty,
        bottlesReturnedGood: retGood,
        bottlesReturnedBroken: retBroken,
        cashReceived: cash,
        paymentMethod,
        remarks
      }
    });

    if (cash > 0) {
      await tx[`${prefix}Payment`].create({
        data: {
          orderId: o.id,
          customerId: o.customerId,
          amount: cash,
          type: paymentMethod || 'CASH'
        }
      });
    }

    // 19L Deductions & Transactions
    if (o.type === '19L' && qty > 0) {
      // Deduct 1 Large/Big 19L Cap per bottle
      const largeCap = await tx[`${prefix}Item`].findFirst({
        where: {
          type: 'RAW_MATERIAL',
          OR: [
            { name: { contains: 'large cap', mode: 'insensitive' } },
            { name: { contains: 'big cap', mode: 'insensitive' } },
            { name: { contains: '19l cap', mode: 'insensitive' } },
            { name: { contains: 'big 19l', mode: 'insensitive' } }
          ]
        }
      });
      if (largeCap) {
        await tx[`${prefix}Item`].update({ where: { id: largeCap.id }, data: { cachedQty: { decrement: qty } } });
        await tx[`${prefix}InventoryTransaction`].create({
          data: { itemId: largeCap.id, quantity: qty, direction: 'OUT', reason: '19L_DELIVERY_CAPS', refType: 'ORDER', refId: o.id }
        });
      }

      // Deduct Mineral Fraction (24L treated water per bottle / 15,141L per mineral set per owner specs)
      const WATER_PER_BOTTLE = 24;
      const WATER_PER_MINERAL_SET = 15141;
      const mineralSetFraction = new Prisma.Decimal(qty * WATER_PER_BOTTLE).dividedBy(WATER_PER_MINERAL_SET);

      const items = await tx[`${prefix}Item`].findMany({ where: { type: 'RAW_MATERIAL', archivedAt: null } });
      const minerals = [
        { search: 'calcium', factor: 2 },
        { search: 'magnesium', factor: 1 },
        { search: 'sodium', factor: 0.5 }
      ];

      for (const m of minerals) {
        const minItem = items.find(i => i.name.toLowerCase().includes(m.search));
        if (minItem && mineralSetFraction.greaterThan(0)) {
          const qtyUsed = mineralSetFraction.mul(m.factor);
          await tx[`${prefix}Item`].update({ where: { id: minItem.id }, data: { cachedQty: { decrement: qtyUsed } } });
          await tx[`${prefix}InventoryTransaction`].create({
            data: { itemId: minItem.id, quantity: qtyUsed, direction: 'OUT', reason: '19L_DELIVERY_MINERALS', refType: 'ORDER', refId: o.id }
          });
        }
      }

      // Bottle Ledger Transactions
      if (qty > 0) {
        await tx[`${prefix}BottleTransaction`].create({
          data: { customerId: o.customerId, type: 'DELIVERED_TO_CUSTOMER', quantity: qty, reason: `Order ${o.id}` }
        });
      }
    }

    if (retGood > 0) {
      await tx[`${prefix}BottleTransaction`].create({
        data: { customerId: o.customerId, type: 'RETURNED_GOOD', quantity: retGood, reason: `Order ${o.id}` }
      });
    }
    if (retBroken > 0) {
      await tx[`${prefix}BottleTransaction`].create({
        data: { customerId: o.customerId, type: 'RETURNED_BROKEN', quantity: retBroken, reason: `Order ${o.id}` }
      });
    }

    // PET Deductions
    if (o.type === 'PET') {
      for (const orderItem of o.items) {
        await tx[`${prefix}Item`].update({
          where: { id: orderItem.itemId },
          data: { cachedQty: { decrement: orderItem.quantity } }
        });
        await tx[`${prefix}InventoryTransaction`].create({
          data: { itemId: orderItem.itemId, quantity: orderItem.quantity, direction: 'OUT', reason: 'PET_DELIVERY', refType: 'ORDER', refId: o.id }
        });
      }
    }

    // Update Customer Balance and Bottle Balance
    await tx[`${prefix}Customer`].update({
      where: { id: o.customerId },
      data: { 
        cachedBottleBalance: { increment: qty - retGood - retBroken },
        cachedBalance: { increment: orderTotal - cash }
      }
    });

    // Update Order Status
    const updated = await tx[`${prefix}Order`].update({
      where: { id },
      data: { deliveryStatus: 'DELIVERED', paymentStatus: cash >= orderTotal ? 'PAID' : (cash > 0 ? 'PARTIAL' : 'UNPAID') }
    });

    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'ORDER_DELIVERED',
        entityType: 'Order',
        entityId: updated.id,
        performedBy: req.user?.id || 'Unknown',
        details: JSON.stringify({ qtyDelivered: qty, cashReceived: cash, returnedGood: retGood, returnedBroken: retBroken })
      }
    });

    return updated;
  });

  broadcastDashboardUpdate();
  res.json({ success: true, data: order });
});

export const getOrderPDF = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  const order = await prisma[`${prefix}Order`].findUnique({
    where: { id },
    include: { customer: true, items: { include: { item: true } } }
  });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const { generateInvoicePDF } = await import('../utils/pdfGenerator.js');
  const pdfBuffer = await generateInvoicePDF(order, prefix);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${id.substring(0, 8)}.pdf"`);
  res.send(pdfBuffer);
});

import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;

const QTY_THRESHOLDS = {
  Home: 5,
  Office: 20,
  Shop: 30,
  Restaurant: 50,
  Commercial: 100,
  Distributor: 500
};

/** Resolves and standardizes items in an order payload */
async function resolveOrderItems(prefix, items) {
  const nonUUIDs = items.filter(i => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.itemId) && i.productName);
  const existingItems = nonUUIDs.length > 0
    ? await prisma[`${prefix}Item`].findMany({
        where: { name: { in: nonUUIDs.map(i => i.productName), mode: 'insensitive' }, archivedAt: null }
      })
    : [];

  const map = new Map(existingItems.map(it => [it.name.toLowerCase(), it]));
  const resolved = [];

  for (const i of items) {
    let dbItemId = i.itemId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbItemId) && i.productName) {
      const match = map.get(i.productName.toLowerCase());
      if (match) {
        dbItemId = match.id;
      } else {
        const created = await prisma[`${prefix}Item`].create({
          data: { name: i.productName, type: 'FINISHED_GOOD', unit: 'Bottles', cachedQty: 0 }
        });
        map.set(i.productName.toLowerCase(), created);
        dbItemId = created.id;
      }
    }
    resolved.push({ itemId: dbItemId, quantity: parseInt(i.quantity, 10), price: parseFloat(i.price) });
  }
  return resolved;
}

/** Retrieves latest 50 sales orders */
export const getOrders = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const orders = await prisma[`${prefix}Order`].findMany({
    include: {
      customer: true,
      items: { include: { item: true } },
      payments: true,
      deliveries: true
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  return sendSuccess(res, orders);
});

/** Creates a new customer order with credit checks and audit log */
export const createOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { customerId, type, items, expectedDelivery, remarks, paymentStatus, bypassCreditCheck } = req.body; 
  if (!customerId || !type || !items?.length) throw new ApiError(400, 'Invalid payload');

  const customer = await prisma[`${prefix}Customer`].findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  const resolvedItems = await resolveOrderItems(prefix, items);
  const orderTotal = resolvedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const totalQty = resolvedItems.reduce((sum, i) => sum + i.quantity, 0);

  // Soft-block check for unusual quantity
  const maxQty = QTY_THRESHOLDS[customer.type] || 20;
  if (totalQty > maxQty && !bypassCreditCheck) {
    return res.status(200).json({
      success: false,
      softBlock: true,
      blockReason: 'UNUSUAL_QUANTITY',
      message: `Unusual quantity detected. A ${customer.type} customer typically does not order ${totalQty} items at once (Limit: ${maxQty}). Are you sure you want to proceed?`
    });
  }

  // Credit limit soft-block check
  const currentBalance = parseFloat(customer.currentBalance || 0);
  const creditLimit = parseFloat(customer.creditLimit || 0);
  if (creditLimit > 0 && (currentBalance + orderTotal) > creditLimit && !bypassCreditCheck) {
    return res.status(200).json({
      success: false,
      softBlock: true,
      blockReason: 'BALANCE_EXCEEDED',
      message: `Order amount exceeds credit limit. Order: Rs. ${orderTotal}, Current Debt: Rs. ${currentBalance}, Limit: Rs. ${creditLimit}. Proceed?`
    });
  }

  // Bottle security deposit check (for 19L orders)
  const dbItems = await prisma[`${prefix}Item`].findMany({ where: { id: { in: resolvedItems.map(i => i.itemId) } } });
  const qty19LOrdered = resolvedItems.reduce((sum, i) => {
    const dbItem = dbItems.find(di => di.id === i.itemId);
    return dbItem?.name.toLowerCase().includes('19l') ? sum + i.quantity : sum;
  }, 0);

  if (qty19LOrdered > 0 && !bypassCreditCheck) {
    const currentBottles = parseInt(customer.cachedBottleBalance || 0, 10);
    const newBottleBalance = currentBottles + qty19LOrdered;
    const coveredBottles = Math.floor(parseInt(customer.deposit || 0, 10) / 1000);

    if (newBottleBalance > coveredBottles) {
      return res.status(200).json({
        success: false,
        softBlock: true,
        blockReason: 'BOTTLE_SECURITY_EXCEEDED',
        message: `Customer's bottle security deposit (Rs. ${customer.deposit || 0}) covers ${coveredBottles} bottles only.\nBottles after this order: ${newBottleBalance}\nIncrease deposit or continue with override?`
      });
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx[`${prefix}Order`].create({
      data: { 
        customerId, 
        type,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        remarks,
        paymentStatus: paymentStatus || 'UNPAID',
        items: {
          create: resolvedItems.map(i => ({ itemId: i.itemId, quantity: i.quantity, price: i.price }))
        }
      },
      include: { items: { include: { item: true } } }
    });

    const customerObj = await tx[`${prefix}Customer`].findUnique({ where: { id: customerId }, select: { name: true } });
    await createAuditLog(prefix, {
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: o.id,
      performedBy: req.user?.name || req.user?.id?.substring(0, 6) || 'Admin',
      details: `Order #${o.id.slice(0, 6).toUpperCase()} created for ${customerObj?.name || 'Customer'} (${totalQty} units • Rs. ${orderTotal.toLocaleString()})`
    });

    return o;
  }, { maxWait: 10000, timeout: 30000 });

  return sendSuccess(res, order, 201);
});

/** Updates an undelivered order's expected delivery, items, or remarks */
export const updateOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { expectedDelivery, remarks, items, type } = req.body;

  const order = await prisma[`${prefix}Order`].findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.deliveryStatus === 'DELIVERED') throw new ApiError(400, 'Cannot edit a delivered order');

  const updated = await prisma.$transaction(async (tx) => {
    if (items?.length) {
      await tx[`${prefix}OrderItem`].deleteMany({ where: { orderId: id } });
      await tx[`${prefix}OrderItem`].createMany({
        data: items.map(i => ({
          orderId: id,
          itemId: i.itemId,
          quantity: parseInt(i.quantity, 10),
          price: parseFloat(i.price)
        }))
      });
    }

    return await tx[`${prefix}Order`].update({
      where: { id },
      data: {
        expectedDelivery: expectedDelivery !== undefined ? (expectedDelivery ? new Date(expectedDelivery) : null) : order.expectedDelivery,
        remarks: remarks !== undefined ? remarks : order.remarks,
        ...(type && { type })
      },
      include: { items: { include: { item: true } } }
    });
  }, { maxWait: 10000, timeout: 30000 });

  return sendSuccess(res, updated);
});

/** Fulfills and delivers an order, recording returns, cash, and inventory deduction */
export const deliverOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { 
    qtyDelivered = 0, 
    bottlesReturnedGood = 0, 
    bottlesReturnedBroken = 0, 
    cashReceived = 0, 
    paymentMethod = 'CASH', 
    remarks,
    bypassBottleCheck
  } = req.body;

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx[`${prefix}Order`].findUnique({ 
      where: { id }, 
      include: { 
        items: { include: { item: true } }, 
        customer: true,
        payments: true,
        deliveries: true
      } 
    });
    if (!o) throw new ApiError(404, 'Order not found');

    const qty = parseInt(qtyDelivered, 10) || 0;
    const retGood = parseInt(bottlesReturnedGood, 10) || 0;
    const retBroken = parseInt(bottlesReturnedBroken, 10) || 0;
    const cash = parseFloat(cashReceived) || 0;
    const orderTotal = o.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const alreadyPaid = o.payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
    const remainingOrderBalance = Math.max(0, orderTotal - alreadyPaid);
    const currentDebt = Math.max(0, parseFloat(o.customer.currentBalance || 0));
    const maxPayable = remainingOrderBalance + currentDebt;

    if (cash > maxPayable && maxPayable > 0) {
      throw new ApiError(400, `Cash received (Rs. ${cash}) cannot exceed total customer payable balance (Rs. ${maxPayable}).`);
    }

    // CASE 1: Order is ALREADY DELIVERED — Settle payment
    if (o.deliveryStatus === 'DELIVERED') {
      if (cash <= 0 && retGood <= 0 && retBroken <= 0) {
        throw new ApiError(400, 'Order is already delivered. Enter cash received to settle payment.');
      }

      const qty19LOnOrder = o.items.filter(i => i.item?.name?.toLowerCase().includes('19l')).reduce((sum, i) => sum + i.quantity, 0);
      const prevReturned = o.deliveries?.reduce((sum, d) => sum + (d.bottlesReturnedGood || 0) + (d.bottlesReturnedBroken || 0), 0) || 0;
      const remainingBottlesAllowed = Math.max(0, qty19LOnOrder - prevReturned);

      if (qty19LOnOrder > 0 && (retGood + retBroken > remainingBottlesAllowed)) {
        throw new ApiError(400, `Returned bottles (${retGood + retBroken}) exceed maximum allowed remaining (${remainingBottlesAllowed}).`);
      }

      const customerSnapshot = await tx[`${prefix}Customer`].findUnique({
        where: { id: o.customerId },
        select: { currentBalance: true, deposit: true, cachedBottleBalance: true }
      });
      const currentCustomerDebt = Math.max(0, Number(customerSnapshot.currentBalance || 0));

      let debtReduction = 0;
      let depositRestored = 0;
      if (cash > 0) {
        debtReduction = Math.min(currentCustomerDebt, cash);
        depositRestored = Math.max(0, cash - debtReduction);
        await tx[`${prefix}Payment`].create({
          data: { orderId: o.id, customerId: o.customerId, amount: cash, type: paymentMethod }
        });
      }

      const customerUpdateData = {};
      if (debtReduction > 0) customerUpdateData.currentBalance = { decrement: debtReduction };
      if (depositRestored > 0) customerUpdateData.deposit = { increment: depositRestored };
      if (retGood + retBroken > 0) customerUpdateData.cachedBottleBalance = { decrement: retGood + retBroken };

      if (Object.keys(customerUpdateData).length > 0) {
        await tx[`${prefix}Customer`].update({ where: { id: o.customerId }, data: customerUpdateData });
      }

      if (retGood > 0 || retBroken > 0) {
        await tx[`${prefix}Delivery`].create({
          data: { orderId: o.id, qtyDelivered: 0, bottlesReturnedGood: retGood, bottlesReturnedBroken: retBroken, cashReceived: cash, paymentMethod, remarks }
        });

        if (retGood > 0) {
          await tx[`${prefix}BottleTransaction`].create({
            data: { customerId: o.customerId, type: 'RETURNED_GOOD', quantity: retGood, reason: `Order ${o.id} (Payment Settlement)` }
          });
          const emptyBottle = await tx[`${prefix}Item`].findFirst({ where: { type: 'RAW_MATERIAL', name: { contains: 'empty', mode: 'insensitive' } } });
          if (emptyBottle) {
            await tx[`${prefix}Item`].update({ where: { id: emptyBottle.id }, data: { cachedQty: { increment: retGood }, factoryQty: { increment: retGood } } });
            await tx[`${prefix}InventoryTransaction`].create({
              data: { itemId: emptyBottle.id, quantity: retGood, direction: 'IN', reason: 'BOTTLE_RETRIEVAL', refType: 'ORDER', refId: o.id, location: 'FACTORY' }
            });
          }
        }
        if (retBroken > 0) {
          await tx[`${prefix}BottleTransaction`].create({
            data: { customerId: o.customerId, type: 'RETURNED_BROKEN', quantity: retBroken, reason: `Order ${o.id} (Payment Settlement)` }
          });
        }
      }

      const newTotalPaid = alreadyPaid + cash;
      const newPaymentStatus = newTotalPaid >= orderTotal ? 'PAID' : (newTotalPaid > 0 ? 'PARTIAL' : 'UNPAID');

      const updated = await tx[`${prefix}Order`].update({
        where: { id },
        data: { paymentStatus: newPaymentStatus },
        include: { items: { include: { item: true } }, customer: true, payments: true, deliveries: true }
      });

      await createAuditLog(prefix, {
        action: 'ORDER_PAYMENT_SETTLED',
        entityType: 'Order',
        entityId: updated.id,
        performedBy: req.user?.id || 'Unknown',
        details: JSON.stringify({ cashReceived: cash, newTotalPaid, newPaymentStatus, debtReduction, depositRestored, bottlesReturnedGood: retGood, bottlesReturnedBroken: retBroken })
      });

      return updated;
    }

    // CASE 2: Order is being delivered for the first time
    // Stock validation
    const itemIds = o.items.map(i => i.itemId).filter(Boolean);
    const itemObjs = itemIds.length > 0 ? await tx[`${prefix}Item`].findMany({ where: { id: { in: itemIds } } }) : [];
    const itemMap = new Map(itemObjs.map(it => [it.id, it]));

    for (const orderItem of o.items) {
      if (orderItem.itemId) {
        const itemObj = itemMap.get(orderItem.itemId);
        if (itemObj) {
          const factoryStock = Number(itemObj.factoryQty !== undefined && itemObj.factoryQty !== null ? itemObj.factoryQty : itemObj.cachedQty || 0);
          const reqQty = Number(orderItem.quantity || 0);
          if (factoryStock < reqQty) {
            throw new ApiError(
              400,
              `❌ Cannot deliver order: Insufficient Factory Floor stock for "${itemObj.name}". Required: ${reqQty}, Available on Factory Floor: ${factoryStock}.`
            );
          }
        }
      }
    }

    const has19L = o.items.some(i => i.item?.name?.toLowerCase().includes('19l'));
    const qty19L = o.items.filter(i => i.item?.name?.toLowerCase().includes('19l')).reduce((sum, i) => sum + i.quantity, 0) || (has19L ? qty : 0);

    const currentBottles = o.customer.cachedBottleBalance || 0;
    if ((retGood + retBroken > currentBottles + qty19L) && !bypassBottleCheck) {
      throw new ApiError(400, `SOFT_BLOCK_BOTTLES: Customer holds only ${currentBottles} bottles, but returning ${retGood + retBroken}. Proceed anyway?`);
    }

    await tx[`${prefix}Delivery`].create({
      data: { orderId: o.id, qtyDelivered: qty, bottlesReturnedGood: retGood, bottlesReturnedBroken: retBroken, cashReceived: cash, paymentMethod, remarks }
    });

    if (cash > 0) {
      await tx[`${prefix}Payment`].create({
        data: { orderId: o.id, customerId: o.customerId, amount: cash, type: paymentMethod }
      });
    }

    if (has19L && qty19L > 0) {
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
        await tx[`${prefix}Item`].update({ where: { id: largeCap.id }, data: { cachedQty: { decrement: qty19L } } });
        await tx[`${prefix}InventoryTransaction`].create({
          data: { itemId: largeCap.id, quantity: qty19L, direction: 'OUT', reason: '19L_DELIVERY_CAPS', refType: 'ORDER', refId: o.id }
        });
      }

      // Mineral deduction: 24L treated water per bottle / 15,141L per mineral set
      const mineralSetFraction = new Prisma.Decimal(qty19L * 24).dividedBy(15141);
      const rawItems = await tx[`${prefix}Item`].findMany({ where: { type: 'RAW_MATERIAL', archivedAt: null } });
      const minerals = [
        { search: 'calcium', factor: 2 },
        { search: 'magnesium', factor: 1 },
        { search: 'sodium', factor: 0.5 }
      ];

      for (const m of minerals) {
        const minItem = rawItems.find(i => i.name.toLowerCase().includes(m.search));
        if (minItem && mineralSetFraction.greaterThan(0)) {
          const qtyUsed = mineralSetFraction.mul(m.factor);
          await tx[`${prefix}Item`].update({ where: { id: minItem.id }, data: { cachedQty: { decrement: qtyUsed } } });
          await tx[`${prefix}InventoryTransaction`].create({
            data: { itemId: minItem.id, quantity: qtyUsed, direction: 'OUT', reason: '19L_DELIVERY_MINERALS', refType: 'ORDER', refId: o.id }
          });
        }
      }

      await tx[`${prefix}BottleTransaction`].create({
        data: { customerId: o.customerId, type: 'DELIVERED_TO_CUSTOMER', quantity: qty19L, reason: `Order ${o.id}` }
      });
    }

    if (retGood > 0) {
      await tx[`${prefix}BottleTransaction`].create({
        data: { customerId: o.customerId, type: 'RETURNED_GOOD', quantity: retGood, reason: `Order ${o.id}` }
      });
      const emptyBottle = await tx[`${prefix}Item`].findFirst({ where: { type: 'RAW_MATERIAL', name: { contains: 'empty', mode: 'insensitive' } } });
      if (emptyBottle) {
        await tx[`${prefix}Item`].update({ where: { id: emptyBottle.id }, data: { cachedQty: { increment: retGood }, factoryQty: { increment: retGood } } });
        await tx[`${prefix}InventoryTransaction`].create({
          data: { itemId: emptyBottle.id, quantity: retGood, direction: 'IN', reason: 'BOTTLE_RETRIEVAL', refType: 'ORDER', refId: o.id, location: 'FACTORY' }
        });
      }
    }
    if (retBroken > 0) {
      await tx[`${prefix}BottleTransaction`].create({
        data: { customerId: o.customerId, type: 'RETURNED_BROKEN', quantity: retBroken, reason: `Order ${o.id}` }
      });
    }

    // Deduct finished goods exclusively from Factory Floor
    for (const orderItem of o.items) {
      if (orderItem.itemId) {
        const is19L = orderItem.item?.name?.toLowerCase().includes('19l');
        const qtyToDeduct = Number(orderItem.quantity || 0);

        await tx[`${prefix}Item`].update({
          where: { id: orderItem.itemId },
          data: { cachedQty: { decrement: qtyToDeduct }, factoryQty: { decrement: qtyToDeduct } }
        });

        await tx[`${prefix}InventoryTransaction`].create({
          data: { 
            itemId: orderItem.itemId, 
            quantity: orderItem.quantity, 
            direction: 'OUT', 
            reason: is19L ? '19L_DELIVERY' : 'PET_DELIVERY', 
            refType: 'ORDER', 
            refId: o.id,
            location: 'FACTORY'
          }
        });
      }
    }

    // Customer financial & balance updates
    const unpaidAmount = Math.max(0, orderTotal - cash);
    const customerSnapshot = await tx[`${prefix}Customer`].findUnique({ where: { id: o.customerId }, select: { deposit: true } });
    const existingDeposit = parseFloat(customerSnapshot.deposit || 0);

    let depositDeduction = 0;
    let debtAddition = 0;
    if (unpaidAmount > 0) {
      if (existingDeposit > 0) {
        depositDeduction = Math.min(existingDeposit, unpaidAmount);
        debtAddition = unpaidAmount - depositDeduction;
      } else {
        debtAddition = unpaidAmount;
      }
    }

    const customerUpdateData = { lastDeliveryAt: new Date() };
    if (depositDeduction > 0) customerUpdateData.deposit = { decrement: depositDeduction };
    if (debtAddition > 0) customerUpdateData.currentBalance = { increment: debtAddition };

    if (prefix !== 'wadaana') {
      customerUpdateData.cachedBottleBalance = { increment: qty19L - retGood - retBroken };
    } else {
      for (const orderItem of o.items) {
        const iName = orderItem.item?.name?.toLowerCase() || '';
        const qtyItem = orderItem.quantity || 0;
        if (iName.includes('pure') && (iName.includes('0.5l') || iName.includes('500ml'))) {
          customerUpdateData.qtyPure05L = { increment: qtyItem };
          customerUpdateData.buysPure05L = true;
        } else if (iName.includes('pure') && (iName.includes('1.5l') || iName.includes('1500ml'))) {
          customerUpdateData.qtyPure15L = { increment: qtyItem };
          customerUpdateData.buysPure15L = true;
        } else if (iName.includes('mix') && (iName.includes('0.5l') || iName.includes('500ml'))) {
          customerUpdateData.qtyMix05L = { increment: qtyItem };
          customerUpdateData.buysMix05L = true;
        } else if (iName.includes('mix') && (iName.includes('1.5l') || iName.includes('1500ml'))) {
          customerUpdateData.qtyMix15L = { increment: qtyItem };
          customerUpdateData.buysMix15L = true;
        }
      }
    }

    await tx[`${prefix}Customer`].update({ where: { id: o.customerId }, data: customerUpdateData });

    const updated = await tx[`${prefix}Order`].update({
      where: { id },
      data: { deliveryStatus: 'DELIVERED', paymentStatus: cash >= orderTotal ? 'PAID' : (cash > 0 ? 'PARTIAL' : 'UNPAID') }
    });

    await createAuditLog(prefix, {
      action: 'ORDER_DELIVERED',
      entityType: 'Order',
      entityId: updated.id,
      performedBy: req.user?.name || req.user?.id?.substring(0, 6) || 'Admin',
      details: `Order #${updated.id.slice(0, 6).toUpperCase()} delivered to ${o.customer?.name || 'Customer'} • Cash Received: Rs. ${cash.toLocaleString()}${retGood > 0 ? ` (${retGood} bottles returned)` : ''}`
    });

    return updated;
  }, { maxWait: 10000, timeout: 30000 });

  broadcastDashboardUpdate();
  return sendSuccess(res, order);
});

/** Generates and streams PDF invoice */
export const getOrderPDF = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  const order = await prisma[`${prefix}Order`].findUnique({
    where: { id },
    include: { customer: true, items: { include: { item: true } } }
  });
  if (!order) throw new ApiError(404, 'Order not found');

  const { generateInvoicePDF } = await import('../utils/pdfGenerator.js');
  const pdfBuffer = await generateInvoicePDF(order, prefix);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${id.substring(0, 8)}.pdf"`);
  res.send(pdfBuffer);
});

/** Soft cancels an undelivered sales order */
export const deleteOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  if (!['OWNER', 'MARKETING_MANAGER'].includes(req.user?.role)) {
    throw new ApiError(403, 'Only Owner or Marketing Manager can delete orders');
  }

  const order = await prisma[`${prefix}Order`].findUnique({ where: { id } });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.deliveryStatus === 'DELIVERED') {
    throw new ApiError(400, 'Cannot cancel/delete an order that has already been delivered.');
  }

  await prisma[`${prefix}Order`].update({
    where: { id },
    data: { deliveryStatus: 'CANCELLED', paymentStatus: 'UNPAID' }
  });

  await createAuditLog(prefix, {
    action: 'ORDER_CANCELLED',
    entityType: 'Order',
    entityId: id,
    performedBy: req.user?.id || 'Unknown',
    details: `Order ${id} soft-deleted and marked as CANCELLED`
  });

  broadcastDashboardUpdate();
  return sendSuccess(res, null, 200, { message: 'Order marked as cancelled' });
});

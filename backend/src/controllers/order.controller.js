import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { broadcastEvent } from '../utils/sseBus.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';
import { getTenantOperationalDefaults } from './settings.controller.js';
import {
  extractReturnablesFromOrderItems,
  creditEmptyBottlesToFactory,
  debitEmptyBottlesFromFactory
} from '../services/bottleInventory.service.js';

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

/** Calculates whether order has 18% GST enabled */
export const hasOrderGst = (order) => Boolean(order?.withGst);

/** Calculates subtotal of order items */
export const getOrderSubtotal = (order) =>
  (order?.items || []).reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 0)), 0);

/** Calculates total of order including 18% GST if applicable */
export const getOrderTotal = (order) => {
  const sub = getOrderSubtotal(order);
  return sub + (hasOrderGst(order) ? Math.round(sub * 0.18) : 0);
};

/** Attaches subtotal, total, and previousUnpaidBalance to order objects */
export const attachOrderBalances = (orders) => {
  const list = Array.isArray(orders) ? orders : [orders];
  const mapped = list.map(order => {
    const custBalance = Number(order.customer?.currentBalance || 0);
    const sub = (order.items || []).reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0);
    const total = sub + (order.withGst ? Math.round(sub * 0.18) : 0);
    const paid = (order.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const orderUnpaid = Math.max(0, total - paid);

    let prevBalance = custBalance;
    if (order.deliveryStatus === 'DELIVERED') {
      prevBalance = Math.max(0, custBalance - orderUnpaid);
    }

    const normalizedItems = (order.items || []).map(it => {
      if (!it?.item) return it;
      const itemObj = { ...it.item };
      if (itemObj.type === 'FINISHED_GOOD' || !itemObj.type) {
        const nameLower = (itemObj.name || '').toLowerCase();
        if (nameLower.includes('bulk') || (itemObj.unit && itemObj.unit.toLowerCase() === 'litres')) {
          itemObj.unit = 'Litres';
        } else {
          itemObj.unit = Number(itemObj.packSize) > 1 ? 'packs' : 'bottles';
        }
        itemObj.hasReturnableContainer = Boolean(
          itemObj.recipeFinishedGoods?.some(r => r.rawMaterial?.isReturnable)
        );
      }
      return { ...it, item: itemObj };
    });

    return {
      ...order,
      items: normalizedItems,
      orderSubtotal: sub,
      orderTotal: total,
      previousUnpaidBalance: prevBalance
    };
  });
  return Array.isArray(orders) ? mapped : mapped[0];
};

/** Retrieves sales orders with optional pagination */
export const getOrders = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { page, limit } = req.query;

  const hasExplicitLimit = limit !== undefined && limit !== '' && limit !== 'all';

  const include = {
    customer: true,
    items: {
      include: {
        item: {
          include: {
            recipeFinishedGoods: {
              include: { rawMaterial: true }
            }
          }
        }
      }
    },
    payments: true,
    deliveries: true
  };

  if (hasExplicitLimit) {
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
    const parsedPage = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const [orders, total] = await Promise.all([
      prisma[`${prefix}Order`].findMany({
        include,
        skip,
        take: parsedLimit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma[`${prefix}Order`].count()
    ]);

    return sendSuccess(res, attachOrderBalances(orders), 200, {
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit) || 1
      }
    });
  }

  const orders = await prisma[`${prefix}Order`].findMany({
    include,
    orderBy: { createdAt: 'desc' }
  });
  return sendSuccess(res, attachOrderBalances(orders));
});

/** Creates a new customer order with credit checks and audit log */
export const createOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { customerId, type, items, expectedDelivery, remarks, paymentStatus, bypassCreditCheck, withGst } = req.body; 
  if (!customerId || !type || !items?.length) throw new ApiError(400, 'Invalid payload');

  const customer = await prisma[`${prefix}Customer`].findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  const resolvedItems = await resolveOrderItems(prefix, items);
  const orderSubtotal = resolvedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const orderGst = withGst ? Math.round(orderSubtotal * 0.18) : 0;
  const orderTotal = orderSubtotal + orderGst;
  const totalQty = resolvedItems.reduce((sum, i) => sum + i.quantity, 0);

  const opSettings = await getTenantOperationalDefaults(prefix);
  const dbItems = await prisma[`${prefix}Item`].findMany({ where: { id: { in: resolvedItems.map(i => i.itemId) } } });

  // 1. Flexible Low Finished Goods Stock Warning (for all items, all tenants)
  if (opSettings.enableLowStockWarning && !bypassCreditCheck) {
    const lowStockItems = [];
    for (const rItem of resolvedItems) {
      const dbItem = dbItems.find(di => di.id === rItem.itemId);
      if (dbItem) {
        const packMultiplier = Number(dbItem.packSize || 1);
        const requiredBaseUnits = rItem.quantity * packMultiplier;
        const availableStock = parseFloat(dbItem.cachedQty || 0);
        if (requiredBaseUnits > availableStock) {
          const availPacks = packMultiplier > 1 ? `${Math.floor(availableStock / packMultiplier)} packs (${availableStock} bottles)` : `${availableStock}`;
          lowStockItems.push({
            name: dbItem.name,
            ordered: packMultiplier > 1 ? `${rItem.quantity} packs (${requiredBaseUnits} bottles)` : rItem.quantity,
            available: availPacks
          });
        }
      }
    }

    if (lowStockItems.length > 0) {
      const listStr = lowStockItems
        .map(it => `• ${it.name}: Ordered ${it.ordered}, Current Stock ${it.available}`)
        .join('\n');
      return res.status(200).json({
        success: false,
        softBlock: true,
        blockReason: 'LOW_STOCK_WARNING',
        message: `Low Finished Goods Stock Detected:\n${listStr}\n\nDo you want to proceed anyway (create backorder / schedule production)?`
      });
    }
  }

  // 2. Unusual Quantity Typo Guard (configurable thresholds)
  const qty19LOrdered = resolvedItems.reduce((sum, i) => {
    const dbItem = dbItems.find(di => di.id === i.itemId);
    return dbItem?.name.toLowerCase().includes('19l') ? sum + i.quantity : sum;
  }, 0);

  if (opSettings.enableQuantityAlert && !bypassCreditCheck) {
    const maxQty = opSettings.orderThresholds?.[customer.type]
      || opSettings.orderThresholds?.Corporate
      || opSettings.orderThresholds?.Office
      || 100;
    const qtyToCheck = opSettings.enforceOnlyOn19L ? qty19LOrdered : totalQty;

    if (qtyToCheck > maxQty) {
      return res.status(200).json({
        success: false,
        softBlock: true,
        blockReason: 'UNUSUAL_QUANTITY',
        message: `Unusual quantity detected. A ${customer.type} customer typically does not order ${qtyToCheck} items at once (Limit: ${maxQty}). Are you sure you want to proceed?`
      });
    }
  }

  // 3. Bottle security deposit check (for 19L orders)
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
        withGst: Boolean(withGst),
        paymentStatus: paymentStatus || 'UNPAID',
        items: {
          create: resolvedItems.map(i => ({ itemId: i.itemId, quantity: i.quantity, price: i.price }))
        }
      },
      include: { items: { include: { item: true } } }
    });

    const customerObj = await tx[`${prefix}Customer`].findUnique({ where: { id: customerId }, select: { name: true } });

    if (paymentStatus === 'PAID') {
      await tx[`${prefix}Payment`].create({
        data: {
          orderId: o.id,
          customerId,
          amount: orderTotal,
          type: 'CASH'
        }
      });
    }

    await createAuditLog(prefix, {
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: o.id,
      performedBy: req.user?.name || req.user?.id?.substring(0, 6) || 'Admin',
      details: `Order #${o.id.slice(0, 6).toUpperCase()} created for ${customerObj?.name || 'Customer'} (${totalQty} units • Rs. ${orderTotal.toLocaleString()})${paymentStatus === 'PAID' ? ' • Paid in Advance' : ''}`
    });

    return o;
  }, { maxWait: 10000, timeout: 30000 });

  broadcastEvent(prefix, 'ORDER_UPDATED', { orderId: order.id });
  broadcastDashboardUpdate(prefix);
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

  const resolvedItems = items?.length ? await resolveOrderItems(prefix, items) : null;

  const updated = await prisma.$transaction(async (tx) => {
    let newTotal = undefined;
    if (resolvedItems?.length) {
      newTotal = resolvedItems.reduce((acc, i) => acc + (i.quantity * i.price), 0);
      await tx[`${prefix}OrderItem`].deleteMany({ where: { orderId: id } });
      await tx[`${prefix}OrderItem`].createMany({
        data: resolvedItems.map(i => ({
          orderId: id,
          itemId: i.itemId,
          quantity: parseInt(i.quantity, 10),
          price: parseFloat(i.price)
        }))
      });
    }

    const resOrder = await tx[`${prefix}Order`].update({
      where: { id },
      data: {
        expectedDelivery: expectedDelivery !== undefined ? (expectedDelivery ? new Date(expectedDelivery) : null) : order.expectedDelivery,
        remarks: remarks !== undefined ? remarks : order.remarks,
        ...(type && { type })
      },
      include: {
        customer: true,
        items: {
          include: {
            item: {
              include: {
                recipeFinishedGoods: { include: { rawMaterial: true } }
              }
            }
          }
        },
        payments: true,
        deliveries: true
      }
    });

    await createAuditLog(prefix, {
      action: 'ORDER_UPDATED',
      entityType: 'Order',
      entityId: id,
      performedBy: req.user?.name || req.user?.id || 'Staff',
      details: `Updated order #${id.slice(0, 8)}${newTotal !== undefined ? ` (New Amount: Rs. ${newTotal})` : ''}`
    }, tx);

    return resOrder;
  }, { maxWait: 10000, timeout: 30000 });

  broadcastDashboardUpdate(prefix);
  broadcastEvent(prefix, 'ORDER_UPDATED', { orderId: updated.id });
  return sendSuccess(res, attachOrderBalances(updated));
});

/** Fulfills and delivers an order, recording returns, cash, and inventory deduction */
export const deliverOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { 
    qtyDelivered = 0, 
    bottlesReturnedGood = 0, 
    bottlesReturnedBroken = 0, 
    bottlesLost = 0,
    cashReceived = 0, 
    paymentMethod = 'CASH', 
    settleFromSecurity = false,
    remarks,
    bypassBottleCheck,
    returnableItemId = null
  } = req.body;

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx[`${prefix}Order`].findUnique({ 
      where: { id }, 
      include: { 
        items: {
          include: {
            item: {
              include: {
                recipeFinishedGoods: {
                  include: { rawMaterial: true }
                }
              }
            }
          }
        }, 
        customer: true,
        payments: true,
        deliveries: true
      } 
    });
    if (!o) throw new ApiError(404, 'Order not found');

    const qty = parseInt(qtyDelivered, 10) || 0;
    const retGood = parseInt(bottlesReturnedGood, 10) || 0;
    const retBroken = parseInt(bottlesReturnedBroken, 10) || 0;
    const retLost = parseInt(bottlesLost, 10) || 0;
    const totalEmptiesAccounted = retGood + retBroken + retLost;
    const cash = parseFloat(cashReceived) || 0;
    const orderSubtotal = o.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const orderGst = o.withGst ? Math.round(orderSubtotal * 0.18) : 0;
    const orderTotal = orderSubtotal + orderGst;
    const alreadyPaid = o.payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || (o.paymentStatus === 'PAID' ? orderTotal : 0);
    const remainingOrderBalance = Math.max(0, orderTotal - alreadyPaid);
    const currentDebt = Math.max(0, parseFloat(o.customer.currentBalance || 0));
    const maxPayable = remainingOrderBalance + currentDebt;

    if (cash > maxPayable && (maxPayable > 0 || remainingOrderBalance === 0)) {
      throw new ApiError(400, `Cash received (Rs. ${cash}) cannot exceed total customer payable balance (Rs. ${maxPayable}).`);
    }

    // Available security deposit check
    const availableDeposit = Math.max(0, parseFloat(o.customer?.deposit || 0));
    const depositToApply = (settleFromSecurity || paymentMethod === 'SECURITY_DEPOSIT')
      ? Math.min(availableDeposit, remainingOrderBalance)
      : 0;

    // CASE 1: Order is ALREADY DELIVERED — Settle payment
    if (o.deliveryStatus === 'DELIVERED') {
      if (o.paymentStatus === 'PAID' && cash <= 0 && depositToApply <= 0) {
        return o;
      }
      if (cash <= 0 && depositToApply <= 0 && totalEmptiesAccounted <= 0) {
        throw new ApiError(400, 'Order is already delivered. Enter cash received, bottle returns/losses, or select settle from security deposit.');
      }

      const returnables = await extractReturnablesFromOrderItems(tx, prefix, o.items);
      const primaryReturnable = returnables[0] || null;
      const targetItemId = req.body.returnableItemId || primaryReturnable?.rawMaterialId || null;
      const totalReturnableQty = returnables.reduce((sum, r) => sum + r.quantityIssued, 0);
      const prevReturned = o.deliveries?.reduce((sum, d) => sum + (d.bottlesReturnedGood || 0) + (d.bottlesReturnedBroken || 0) + (d.bottlesLost || 0), 0) || 0;
      const remainingBottlesAllowed = Math.max(0, totalReturnableQty - prevReturned);

      if (totalReturnableQty > 0 && totalEmptiesAccounted > remainingBottlesAllowed) {
        throw new ApiError(400, `Returned/lost containers (${totalEmptiesAccounted}) exceed maximum allowed remaining (${remainingBottlesAllowed}).`);
      }

      const customerSnapshot = await tx[`${prefix}Customer`].findUnique({
        where: { id: o.customerId },
        select: { currentBalance: true, deposit: true, cachedBottleBalance: true }
      });
      const currentCustomerDebt = Math.max(0, Number(customerSnapshot.currentBalance || 0));

      const customerUpdateData = {};

      // 1. Apply deposit if requested
      if (depositToApply > 0) {
        customerUpdateData.deposit = { decrement: depositToApply };
        await tx[`${prefix}Payment`].create({
          data: { orderId: o.id, customerId: o.customerId, amount: depositToApply, type: 'SECURITY_DEPOSIT' }
        });
      }

      // 2. Apply cash received
      let debtReduction = 0;
      if (cash > 0) {
        debtReduction = Math.min(currentCustomerDebt, cash);
        await tx[`${prefix}Payment`].create({
          data: { 
            orderId: o.id, 
            customerId: o.customerId, 
            amount: cash, 
            type: paymentMethod === 'SECURITY_DEPOSIT' ? 'CASH' : paymentMethod 
          }
        });
      }

      // Total debt reduction includes any debt cleared by deposit or cash
      const totalDebtReduction = Math.min(currentCustomerDebt, debtReduction + (depositToApply > 0 ? Math.min(currentCustomerDebt - debtReduction, depositToApply) : 0));
      if (totalDebtReduction > 0) {
        customerUpdateData.currentBalance = { decrement: totalDebtReduction };
      }

      if (totalEmptiesAccounted > 0) customerUpdateData.cachedBottleBalance = { decrement: totalEmptiesAccounted };

      if (Object.keys(customerUpdateData).length > 0) {
        await tx[`${prefix}Customer`].update({ where: { id: o.customerId }, data: customerUpdateData });
      }

      if (totalEmptiesAccounted > 0 || cash > 0) {
        await tx[`${prefix}Delivery`].create({
          data: { orderId: o.id, qtyDelivered: 0, bottlesReturnedGood: retGood, bottlesReturnedBroken: retBroken, bottlesLost: retLost, cashReceived: cash, paymentMethod, remarks }
        });

        if (retGood > 0) {
          await tx[`${prefix}BottleTransaction`].create({
            data: { customerId: o.customerId, itemId: targetItemId, type: 'RETURNED_GOOD', quantity: retGood, reason: `Order #${o.id.substring(0, 8).toUpperCase()} (Payment Settlement)` }
          });
          await creditEmptyBottlesToFactory(tx, prefix, {
            quantity: retGood,
            rawMaterialId: targetItemId,
            orderId: o.id,
            customerId: o.customerId,
            reason: 'BOTTLE_RETRIEVAL'
          });
        }
        if (retBroken > 0) {
          await tx[`${prefix}BottleTransaction`].create({
            data: { customerId: o.customerId, itemId: targetItemId, type: 'RETURNED_BROKEN', quantity: retBroken, reason: `Order #${o.id.substring(0, 8).toUpperCase()} (Payment Settlement)` }
          });
        }
        if (retLost > 0) {
          await tx[`${prefix}BottleTransaction`].create({
            data: { customerId: o.customerId, itemId: targetItemId, type: 'MARKED_LOST', quantity: retLost, reason: `Order #${o.id.substring(0, 8).toUpperCase()} (Marked Lost during Settlement)` }
          });
        }
      }

      const newTotalPaid = alreadyPaid + depositToApply + cash;
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
        details: JSON.stringify({ cashReceived: cash, depositApplied: depositToApply, newTotalPaid, newPaymentStatus, debtReduction, bottlesReturnedGood: retGood, bottlesReturnedBroken: retBroken })
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
          const packMultiplier = Number(itemObj.packSize || 1);
          const reqQty = Number(orderItem.quantity || 0) * packMultiplier;
          const factoryStock = Number(itemObj.factoryQty !== undefined && itemObj.factoryQty !== null ? itemObj.factoryQty : itemObj.cachedQty || 0);
          if (factoryStock < reqQty) {
            throw new ApiError(
              400,
              `❌ Cannot deliver order: Insufficient Factory Floor stock for "${itemObj.name}". Required: ${reqQty} bottles (${orderItem.quantity} packs), Available on Factory Floor: ${factoryStock}.`
            );
          }
        }
      }
    }

    const returnables = await extractReturnablesFromOrderItems(tx, prefix, o.items);
    const primaryReturnable = returnables[0] || null;
    const totalReturnableQty = returnables.reduce((sum, r) => sum + r.quantityIssued, 0);
    const resolvedReturnableId = returnableItemId || primaryReturnable?.rawMaterialId || null;

    const currentBottles = o.customer.cachedBottleBalance || 0;
    if ((totalEmptiesAccounted > currentBottles + totalReturnableQty) && !bypassBottleCheck) {
      throw new ApiError(400, `SOFT_BLOCK_BOTTLES: Customer holds only ${currentBottles} containers, but returning/lost ${totalEmptiesAccounted}. Proceed anyway?`);
    }

    // Group 1: Non-dependent creates
    const initialCreates = [
      tx[`${prefix}Delivery`].create({
        data: { orderId: o.id, qtyDelivered: qty, bottlesReturnedGood: retGood, bottlesReturnedBroken: retBroken, bottlesLost: retLost, cashReceived: cash, paymentMethod, remarks }
      })
    ];

    if (cash > 0) {
      initialCreates.push(
        tx[`${prefix}Payment`].create({
          data: { orderId: o.id, customerId: o.customerId, amount: cash, type: paymentMethod === 'SECURITY_DEPOSIT' ? 'CASH' : paymentMethod }
        })
      );
    } else if (o.paymentStatus === 'PAID' && (!o.payments || o.payments.length === 0)) {
      initialCreates.push(
        tx[`${prefix}Payment`].create({
          data: { orderId: o.id, customerId: o.customerId, amount: orderTotal, type: 'CASH' }
        })
      );
    }

    // Returnable container custody update
    if (returnables.length > 0) {
      for (const ret of returnables) {
        if (ret.quantityIssued > 0) {
          initialCreates.push(
            tx[`${prefix}BottleTransaction`].create({
              data: {
                customerId: o.customerId,
                itemId: ret.rawMaterialId,
                type: 'DELIVERED_TO_CUSTOMER',
                quantity: ret.quantityIssued,
                reason: `Order #${o.id.substring(0, 8).toUpperCase()}`
              }
            })
          );
        }
      }
    } else if (totalReturnableQty > 0) {
      initialCreates.push(
        tx[`${prefix}BottleTransaction`].create({
          data: { customerId: o.customerId, itemId: resolvedReturnableId, type: 'DELIVERED_TO_CUSTOMER', quantity: totalReturnableQty, reason: `Order #${o.id.substring(0, 8).toUpperCase()}` }
        })
      );
    }

    if (retGood > 0) {
      initialCreates.push(
        tx[`${prefix}BottleTransaction`].create({
          data: { customerId: o.customerId, itemId: resolvedReturnableId, type: 'RETURNED_GOOD', quantity: retGood, reason: `Order #${o.id.substring(0, 8).toUpperCase()}` }
        })
      );
    }
    if (retBroken > 0) {
      initialCreates.push(
        tx[`${prefix}BottleTransaction`].create({
          data: { customerId: o.customerId, itemId: resolvedReturnableId, type: 'RETURNED_BROKEN', quantity: retBroken, reason: `Order #${o.id.substring(0, 8).toUpperCase()}` }
        })
      );
    }
    if (retLost > 0) {
      initialCreates.push(
        tx[`${prefix}BottleTransaction`].create({
          data: { customerId: o.customerId, itemId: resolvedReturnableId, type: 'MARKED_LOST', quantity: retLost, reason: `Order #${o.id.substring(0, 8).toUpperCase()} (Reported Lost during Delivery)` }
        })
      );
    }

    await Promise.all(initialCreates);

    if (retGood > 0) {
      await creditEmptyBottlesToFactory(tx, prefix, {
        quantity: retGood,
        rawMaterialId: resolvedReturnableId,
        orderId: o.id,
        customerId: o.customerId,
        reason: 'BOTTLE_RETRIEVAL'
      });
    }

    // Deduct finished goods exclusively from Factory Floor in base units (parallel batch)
    const inventoryUpdates = [];
    for (const orderItem of o.items) {
      if (orderItem.itemId) {
        const is19L = orderItem.item?.name?.toLowerCase().includes('19l');
        const packMultiplier = Number(orderItem.item?.packSize || 1);
        const qtyToDeduct = Number(orderItem.quantity || 0) * packMultiplier;

        inventoryUpdates.push(
          tx[`${prefix}Item`].update({
            where: { id: orderItem.itemId },
            data: { cachedQty: { decrement: qtyToDeduct }, factoryQty: { decrement: qtyToDeduct } }
          }),
          tx[`${prefix}InventoryTransaction`].create({
            data: { 
              itemId: orderItem.itemId, 
              quantity: qtyToDeduct, 
              direction: 'OUT', 
              reason: is19L ? '19L_DELIVERY' : 'PET_DELIVERY', 
              refType: 'ORDER', 
              refId: o.id,
              location: 'FACTORY'
            }
          })
        );
      }
    }
    if (inventoryUpdates.length > 0) {
      await Promise.all(inventoryUpdates);
    }

    // Customer financial & balance updates (depositToApply already computed at top of function)
    if (depositToApply > 0) {
      await tx[`${prefix}Payment`].create({
        data: {
          orderId: o.id,
          customerId: o.customerId,
          amount: depositToApply,
          type: 'SECURITY_DEPOSIT'
        }
      });
    }

    const totalPaidForOrder = alreadyPaid + depositToApply + cash;
    const unpaidAmount = (o.paymentStatus === 'PAID') ? 0 : Math.max(0, orderTotal - totalPaidForOrder);

    const customerUpdateData = { lastDeliveryAt: new Date() };
    if (depositToApply > 0) {
      customerUpdateData.deposit = { decrement: depositToApply };
    }
    if (unpaidAmount > 0) {
      customerUpdateData.currentBalance = { increment: unpaidAmount };
    }

    if (prefix !== 'wadaana') {
      customerUpdateData.cachedBottleBalance = { increment: totalReturnableQty - totalEmptiesAccounted };
    }

    const finalPaymentStatus = (o.paymentStatus === 'PAID' || totalPaidForOrder >= orderTotal)
      ? 'PAID'
      : (totalPaidForOrder > 0 ? 'PARTIAL' : 'UNPAID');

    const [_, updated] = await Promise.all([
      tx[`${prefix}Customer`].update({ where: { id: o.customerId }, data: customerUpdateData }),
      tx[`${prefix}Order`].update({
        where: { id },
        data: { deliveryStatus: 'DELIVERED', paymentStatus: finalPaymentStatus }
      })
    ]);

    await createAuditLog(prefix, {
      action: 'ORDER_DELIVERED',
      entityType: 'Order',
      entityId: updated.id,
      performedBy: req.user?.name || req.user?.id?.substring(0, 6) || 'Admin',
      details: `Order #${updated.id.slice(0, 6).toUpperCase()} delivered to ${o.customer?.name || 'Customer'} • Cash Received: Rs. ${cash.toLocaleString()}${retGood > 0 ? ` (${retGood} bottles returned)` : ''}`
    });

    return updated;
  }, { maxWait: 10000, timeout: 30000 });

  broadcastDashboardUpdate(prefix);
  broadcastEvent(prefix, 'ORDER_UPDATED', { orderId: order.id });
  broadcastEvent(prefix, 'INVENTORY_CHANGED');
  return sendSuccess(res, order);
});

/** Records payment settlement for an order without triggering delivery */
export const recordOrderPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const { amount = 0, paymentMethod = 'CASH', settleFromSecurity = false, remarks } = req.body;
  const cash = parseFloat(amount || 0);

  const o = await prisma[`${prefix}Order`].findUnique({
    where: { id },
    include: { payments: true, customer: true, items: { include: { item: true } } }
  });
  if (!o) throw new ApiError(404, 'Order not found');

  const alreadyPaid = o.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const orderSubtotal = o.items.reduce((sum, i) => sum + (parseFloat(i.price) * i.quantity), 0);
  const orderGst = o.withGst ? Math.round(orderSubtotal * 0.18) : 0;
  const orderTotal = orderSubtotal + orderGst;
  const remainingOrderBalance = Math.max(0, orderTotal - alreadyPaid);

  const availableDeposit = Math.max(0, parseFloat(o.customer?.deposit || 0));
  const depositToApply = (settleFromSecurity || paymentMethod === 'SECURITY_DEPOSIT')
    ? Math.min(availableDeposit, remainingOrderBalance)
    : 0;

  if (cash <= 0 && depositToApply <= 0) {
    throw new ApiError(400, 'Payment amount must be greater than 0 or settled from security deposit');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const customerSnapshot = await tx[`${prefix}Customer`].findUnique({
      where: { id: o.customerId },
      select: { currentBalance: true, deposit: true }
    });
    const currentCustomerDebt = Math.max(0, Number(customerSnapshot?.currentBalance || 0));

    const customerUpdateData = {};

    if (depositToApply > 0) {
      customerUpdateData.deposit = { decrement: depositToApply };
      await tx[`${prefix}Payment`].create({
        data: { orderId: o.id, customerId: o.customerId, amount: depositToApply, type: 'SECURITY_DEPOSIT' }
      });
    }

    let debtReduction = 0;
    if (cash > 0) {
      debtReduction = Math.min(currentCustomerDebt, cash);
      await tx[`${prefix}Payment`].create({
        data: { 
          orderId: o.id, 
          customerId: o.customerId, 
          amount: cash, 
          type: paymentMethod === 'SECURITY_DEPOSIT' ? 'CASH' : paymentMethod 
        }
      });
      await tx[`${prefix}Delivery`].create({
        data: {
          orderId: o.id,
          qtyDelivered: 0,
          bottlesReturnedGood: 0,
          bottlesReturnedBroken: 0,
          cashReceived: cash,
          paymentMethod,
          remarks: remarks || 'Payment Settlement'
        }
      });
    }

    const totalDebtReduction = Math.min(currentCustomerDebt, debtReduction + (depositToApply > 0 ? Math.min(currentCustomerDebt - debtReduction, depositToApply) : 0));
    if (totalDebtReduction > 0) {
      customerUpdateData.currentBalance = { decrement: totalDebtReduction };
    }

    if (Object.keys(customerUpdateData).length > 0) {
      await tx[`${prefix}Customer`].update({ where: { id: o.customerId }, data: customerUpdateData });
    }

    const newTotalPaid = alreadyPaid + depositToApply + cash;
    const newPaymentStatus = newTotalPaid >= orderTotal ? 'PAID' : (newTotalPaid > 0 ? 'PARTIAL' : 'UNPAID');

    const orderUpdated = await tx[`${prefix}Order`].update({
      where: { id },
      data: { paymentStatus: newPaymentStatus },
      include: { items: { include: { item: true } }, customer: true, payments: true, deliveries: true }
    });

    await createAuditLog(prefix, {
      action: 'ORDER_PAYMENT_SETTLED',
      entityType: 'Order',
      entityId: orderUpdated.id,
      performedBy: req.user?.id || 'Unknown',
      details: JSON.stringify({ cashReceived: cash, depositApplied: depositToApply, newTotalPaid, newPaymentStatus, debtReduction: totalDebtReduction, remarks })
    });

    return orderUpdated;
  });

  broadcastDashboardUpdate(prefix);
  broadcastEvent(prefix, 'ORDER_UPDATED', { orderId: updated.id });
  return sendSuccess(res, updated);
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
  const withGst = req.query.gst === 'true' || req.query.gst === '1' || Boolean(order.withGst);
  const pdfBuffer = await generateInvoicePDF(order, prefix, { withGst });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${id.substring(0, 8)}.pdf"`);
  res.send(pdfBuffer);
});

/** Toggles 18% GST on an order and recalculates customer balance if already delivered */
export const toggleOrderGst = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { withGst } = req.body;

  const targetWithGst = Boolean(withGst);

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx[`${prefix}Order`].findUnique({
      where: { id },
      include: { items: { include: { item: true } }, customer: true, payments: true, deliveries: true }
    });
    if (!order) throw new ApiError(404, 'Order not found');

    const currentWithGst = Boolean(order.withGst);
    if (currentWithGst === targetWithGst) {
      return order;
    }

    const subtotal = order.items.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0);
    const gstDelta = Math.round(subtotal * 0.18);

    // If order is DELIVERED, adjusting GST changes the total receivable from customer
    if (order.deliveryStatus === 'DELIVERED' && gstDelta > 0) {
      if (targetWithGst) {
        // Turning GST ON -> increment customer balance
        await tx[`${prefix}Customer`].update({
          where: { id: order.customerId },
          data: { currentBalance: { increment: gstDelta } }
        });
      } else {
        // Turning GST OFF -> decrement customer balance
        const currentBal = Number(order.customer?.currentBalance || 0);
        const dec = Math.min(currentBal, gstDelta);
        if (dec > 0) {
          await tx[`${prefix}Customer`].update({
            where: { id: order.customerId },
            data: { currentBalance: { decrement: dec } }
          });
        }
      }
    }

    // Re-evaluate paymentStatus against new total
    const newTotal = subtotal + (targetWithGst ? gstDelta : 0);
    const totalPaid = order.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const newPaymentStatus = totalPaid >= newTotal ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'UNPAID');

    const updated = await tx[`${prefix}Order`].update({
      where: { id },
      data: {
        withGst: targetWithGst,
        paymentStatus: newPaymentStatus
      },
      include: { items: { include: { item: true } }, customer: true, payments: true, deliveries: true }
    });

    await createAuditLog(prefix, {
      action: 'ORDER_GST_TOGGLED',
      entityType: 'Order',
      entityId: id,
      performedBy: req.user?.name || req.user?.id || 'Staff',
      details: `GST 18% ${targetWithGst ? 'enabled' : 'disabled'} for Order #${id.slice(0, 6).toUpperCase()} (Delta: Rs. ${gstDelta})`
    }, tx);

    return updated;
  });

  broadcastEvent(prefix, 'ORDER_UPDATED', { orderId: updatedOrder.id });
  broadcastDashboardUpdate(prefix);
  return sendSuccess(res, attachOrderBalances(updatedOrder));
});

/** Deletes sales order permanently (Owner) or soft cancels undelivered orders (Marketing Manager) */
export const deleteOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  if (req.user?.role !== 'OWNER') {
    throw new ApiError(403, 'Only Owner can permanently delete orders');
  }

  const order = await prisma[`${prefix}Order`].findUnique({
    where: { id },
    include: {
      items: { include: { item: true } },
      deliveries: true,
      payments: true,
      customer: true
    }
  });
  if (!order) throw new ApiError(404, 'Order not found');

  // Strictly OWNER: Permanent deletion with comprehensive symmetrical rollback
  await prisma.$transaction(async (tx) => {
    // 1. If the order was DELIVERED, roll back physical inventory and balance mutations
    if (order.deliveryStatus === 'DELIVERED') {
      // 1a. Revert finished goods deduction (restore to factory floor)
      for (const orderItem of order.items) {
        if (orderItem.itemId) {
          const packMultiplier = Number(orderItem.item?.packSize || 1);
          const qtyToRestore = Number(orderItem.quantity || 0) * packMultiplier;

          await tx[`${prefix}Item`].update({
            where: { id: orderItem.itemId },
            data: {
              cachedQty: { increment: qtyToRestore },
              factoryQty: { increment: qtyToRestore }
            }
          });

          await tx[`${prefix}InventoryTransaction`].create({
            data: {
              itemId: orderItem.itemId,
              quantity: qtyToRestore,
              direction: 'IN',
              reason: 'ORDER_DELETED_STOCK_RESTORE',
              refType: 'ORDER',
              refId: order.id,
              location: 'FACTORY'
            }
          });
        }
      }

      // 1b. Revert empty bottle returns retrieved during delivery
      const retGoodTotal = order.deliveries?.reduce((sum, d) => sum + (d.bottlesReturnedGood || 0), 0) || 0;
      const retBrokenTotal = order.deliveries?.reduce((sum, d) => sum + (d.bottlesReturnedBroken || 0), 0) || 0;
      const retLostTotal = order.deliveries?.reduce((sum, d) => sum + (d.bottlesLost || 0), 0) || 0;

      const returnables = await extractReturnablesFromOrderItems(tx, prefix, order.items);
      const primaryReturnable = returnables[0] || null;
      const totalReturnableQty = returnables.reduce((sum, r) => sum + r.quantityIssued, 0);

      if (retGoodTotal > 0) {
        await debitEmptyBottlesFromFactory(tx, prefix, {
          quantity: retGoodTotal,
          rawMaterialId: primaryReturnable?.rawMaterialId,
          orderId: order.id,
          customerId: order.customerId,
          reason: 'ORDER_DELETED_EMPTY_BOTTLE_REVERSAL',
          skipTransactionLog: true
        });
      }

      // 1c. Revert customer debt and bottle custody
      const customerUpdateData = {};
      const sub = order.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
      const orderTotal = order.withGst ? sub + Math.round(sub * 0.18) : sub;
      const depositPaid = order.payments?.filter(p => p.type === 'SECURITY_DEPOSIT').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
      const cashPaid = order.payments?.filter(p => p.type !== 'SECURITY_DEPOSIT').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
      const totalPaid = depositPaid + cashPaid;
      const unpaidDebtAdded = (order.paymentStatus === 'PAID' && order.payments.length === 0) ? 0 : Math.max(0, orderTotal - totalPaid);

      if (depositPaid > 0) {
        customerUpdateData.deposit = { increment: depositPaid };
      }
      if (unpaidDebtAdded > 0) {
        customerUpdateData.currentBalance = { decrement: unpaidDebtAdded };
      }

      if (prefix !== 'wadaana' || totalReturnableQty > 0) {
        const custodyAdded = totalReturnableQty - retGoodTotal - retBrokenTotal - retLostTotal;
        if (custodyAdded !== 0) {
          customerUpdateData.cachedBottleBalance = { decrement: custodyAdded };
        }
      }

      if (Object.keys(customerUpdateData).length > 0) {
        await tx[`${prefix}Customer`].update({
          where: { id: order.customerId },
          data: customerUpdateData
        });
      }
    } else {
      // Order was NOT delivered, but check if security deposit was applied in advance
      const depositPaid = order.payments?.filter(p => p.type === 'SECURITY_DEPOSIT').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
      if (depositPaid > 0) {
        await tx[`${prefix}Customer`].update({
          where: { id: order.customerId },
          data: { deposit: { increment: depositPaid } }
        });
      }
    }

    // 2. Delete all related transactions & child records cleanly
    await tx[`${prefix}BottleTransaction`].deleteMany({
      where: {
        OR: [
          { orderId: id },
          { reason: { contains: id } }
        ]
      }
    });

    await tx[`${prefix}InventoryTransaction`].deleteMany({
      where: { refType: 'ORDER', refId: id }
    });

    await tx[`${prefix}Delivery`].deleteMany({ where: { orderId: id } });
    await tx[`${prefix}Payment`].deleteMany({ where: { orderId: id } });
    await tx[`${prefix}OrderItem`].deleteMany({ where: { orderId: id } });
    await tx[`${prefix}Order`].delete({ where: { id } });

    await createAuditLog(prefix, {
      action: 'ORDER_DELETED',
      entityType: 'Order',
      entityId: id,
      performedBy: req.user?.name || req.user?.id || 'OWNER',
      details: `Order #${id.slice(0, 6).toUpperCase()} permanently deleted and all inventory/balance effects reversed by Owner`
    });
  }, { maxWait: 10000, timeout: 30000 });

  broadcastDashboardUpdate(prefix);
  broadcastEvent(prefix, 'ORDER_UPDATED', { deletedOrderId: id });
  broadcastEvent(prefix, 'INVENTORY_CHANGED');
  broadcastEvent(prefix, 'CUSTOMER_UPDATED', { customerId: order.customerId });
  return sendSuccess(res, null, 200, { message: 'Order and associated records permanently deleted' });
});

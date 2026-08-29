import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { getTenantPrefix } from '../utils/tenant.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;

export const getOrders = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const orders = await prisma[`${prefix}Order`].findMany({
    include: { customer: true, items: { include: { item: true } }, payments: true, deliveries: true },
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

  // Resolve each order item to a real DB Item record (find-or-create by productName)
  const resolvedItems = [];
  for (const i of items) {
    let dbItemId = i.itemId;
    // If itemId is not a UUID (catalog-only ID like PURE_05L), find or create the Item
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbItemId);
    if (!isUUID && i.productName) {
      let dbItem = await prisma[`${prefix}Item`].findFirst({
        where: { name: { equals: i.productName, mode: 'insensitive' }, archivedAt: null }
      });
      if (!dbItem) {
        dbItem = await prisma[`${prefix}Item`].create({
          data: { name: i.productName, type: 'FINISHED_GOOD', unit: 'Bottles', cachedQty: 0 }
        });
      }
      dbItemId = dbItem.id;
    }
    resolvedItems.push({ itemId: dbItemId, quantity: parseInt(i.quantity), price: parseFloat(i.price) });
  }

  const orderTotal = resolvedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const totalQty = resolvedItems.reduce((sum, i) => sum + i.quantity, 0);

  // Quantity soft-block check based on customer type
  const qtyThresholds = {
    Home: 5,
    Office: 20,
    Shop: 30,
    Restaurant: 50,
    Commercial: 100,
    Distributor: 500
  };
  
  const maxQty = qtyThresholds[customer.type] || 20;

  if (totalQty > maxQty && !bypassCreditCheck) {
    return res.status(200).json({
      success: false,
      softBlock: true,
      blockReason: 'UNUSUAL_QUANTITY',
      message: `Unusual quantity detected. A ${customer.type} customer typically does not order ${totalQty} items at once (Limit: ${maxQty}). Are you sure you want to proceed?`
    });
  }

  // 1. Check Credit Limit Soft-Block (only if limit > 0)
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

  // 2. Check Bottle Security Deposit Soft-Block (for 19L orders)
  const BOTTLE_SECURITY_RATE = 1000;
  
  const resolvedItemIds = resolvedItems.map(i => i.itemId);
  const dbItems = await prisma[`${prefix}Item`].findMany({ where: { id: { in: resolvedItemIds } } });
  
  const qty19LOrdered = resolvedItems.reduce((sum, i) => {
    const dbItem = dbItems.find(di => di.id === i.itemId);
    if (dbItem && dbItem.name.toLowerCase().includes('19l')) {
      return sum + i.quantity;
    }
    return sum;
  }, 0);

  if (qty19LOrdered > 0 && !bypassCreditCheck) {
    const currentBottles = parseInt(customer.cachedBottleBalance || 0);
    const newBottleBalance = currentBottles + qty19LOrdered;
    const coveredBottles = Math.floor(parseInt(customer.deposit || 0) / BOTTLE_SECURITY_RATE);

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
          create: resolvedItems.map(i => ({
            itemId: i.itemId,
            quantity: i.quantity,
            price: i.price
          }))
        }
      },
      include: { items: { include: { item: true } } }
    });

    const customerObj = await tx[`${prefix}Customer`].findUnique({ where: { id: customerId }, select: { name: true } });
    const totalQty = resolvedItems.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalAmount = resolvedItems.reduce((s, i) => s + (i.quantity * i.price), 0);
    const orderShortId = o.id.slice(0, 6).toUpperCase();

    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'Order',
        entityId: o.id,
        performedBy: req.user?.name || req.user?.id?.substring(0, 6) || 'Admin',
        details: `Order #${orderShortId} created for ${customerObj?.name || 'Customer'} (${totalQty} units • Rs. ${totalAmount.toLocaleString()})`
      }
    });

    return o;
  }, { maxWait: 10000, timeout: 30000 });

  res.status(201).json({ success: true, data: order });
});

export const updateOrder = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;
  const { expectedDelivery, remarks, items, type } = req.body;

  const order = await prisma[`${prefix}Order`].findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new ApiError(404, 'Order not found');
  
  if (order.deliveryStatus === 'DELIVERED') {
    throw new ApiError(400, 'Cannot edit a delivered order');
  }

  const updated = await prisma.$transaction(async (tx) => {
    // If items are provided, delete old and recreate
    if (items && items.length > 0) {
      await tx[`${prefix}OrderItem`].deleteMany({ where: { orderId: id } });
      await tx[`${prefix}OrderItem`].createMany({
        data: items.map(i => ({
          orderId: id,
          itemId: i.itemId,
          quantity: parseInt(i.quantity),
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

    const qty = parseInt(qtyDelivered || 0); // 19L delivered
    const retGood = parseInt(bottlesReturnedGood || 0);
    const retBroken = parseInt(bottlesReturnedBroken || 0);
    const _q05 = parseInt(qty05LDelivered || 0);
    const _q15 = parseInt(qty15LDelivered || 0);
    const cash = parseFloat(cashReceived || 0);
    const orderTotal = o.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    
    // Calculate total already paid on this order across all payment entries
    const alreadyPaid = o.payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
    const remainingOrderBalance = Math.max(0, orderTotal - alreadyPaid);

    const currentDebt = Math.max(0, parseFloat(o.customer.currentBalance || 0));
    const maxPayable = remainingOrderBalance + currentDebt;

    if (cash > maxPayable && maxPayable > 0) {
      throw new ApiError(400, `Cash received (Rs. ${cash}) cannot exceed total customer payable balance (Rs. ${maxPayable}).`);
    }

    // CASE 1: Order is ALREADY DELIVERED — Process Payment Settlement Run
    if (o.deliveryStatus === 'DELIVERED') {
      if (cash <= 0 && retGood <= 0 && retBroken <= 0) {
        throw new ApiError(400, 'Order is already delivered. Enter cash received to settle payment.');
      }

      // 19L Bottle return check on settlement
      const qty19LOnOrder = o.items.filter(i => i.item?.name?.toLowerCase().includes('19l')).reduce((sum, i) => sum + i.quantity, 0);
      const prevReturnedOnOrder = o.deliveries?.reduce((sum, d) => sum + (d.bottlesReturnedGood || 0) + (d.bottlesReturnedBroken || 0), 0) || 0;
      const remainingBottlesAllowed = Math.max(0, qty19LOnOrder - prevReturnedOnOrder);

      if (qty19LOnOrder > 0 && (retGood + retBroken > remainingBottlesAllowed)) {
        throw new ApiError(400, `Returned bottles (${retGood + retBroken}) exceed maximum allowed remaining (${remainingBottlesAllowed}).`);
      }

      // ===== ATOMIC PAYMENT SETTLEMENT =====
      // Read current customer state ONCE inside transaction for consistency
      const customerSnapshot = await tx[`${prefix}Customer`].findUnique({
        where: { id: o.customerId },
        select: { 
          currentBalance: true, 
          deposit: true,
          cachedBottleBalance: true 
        }
      });

      const currentCustomerDebt = Math.max(0, Number(customerSnapshot.currentBalance || 0));
      const _currentDeposit = Number(customerSnapshot.deposit || 0);

      // Calculate payment allocation atomically
      let debtReduction = 0;
      let depositRestored = 0;

      if (cash > 0) {
        // Priority 1: Reduce debt first
        if (currentCustomerDebt > 0) {
          debtReduction = Math.min(currentCustomerDebt, cash);
        }

        // Priority 2: Restore security deposit with remaining cash
        const remainingCashAfterDebt = cash - debtReduction;
        if (remainingCashAfterDebt > 0) {
          depositRestored = remainingCashAfterDebt;
        }

        // Record payment transaction
        await tx[`${prefix}Payment`].create({
          data: {
            orderId: o.id,
            customerId: o.customerId,
            amount: cash,
            type: paymentMethod || 'CASH'
          }
        });
      }

      // Build atomic customer update
      const customerUpdateData = {};
      if (debtReduction > 0) {
        customerUpdateData.currentBalance = { decrement: debtReduction };
      }
      if (depositRestored > 0) {
        customerUpdateData.deposit = { increment: depositRestored };
      }
      if (retGood + retBroken > 0) {
        customerUpdateData.cachedBottleBalance = { decrement: retGood + retBroken };
      }

      // Execute single atomic customer update
      if (Object.keys(customerUpdateData).length > 0) {
        await tx[`${prefix}Customer`].update({
          where: { id: o.customerId },
          data: customerUpdateData
        });
      }

      // Record bottle returns
      if (retGood > 0 || retBroken > 0) {
        await tx[`${prefix}Delivery`].create({
          data: {
            orderId: o.id,
            qtyDelivered: 0,
            bottlesReturnedGood: retGood,
            bottlesReturnedBroken: retBroken,
            cashReceived: cash,
            paymentMethod,
            remarks
          }
        });

        if (retGood > 0) {
          await tx[`${prefix}BottleTransaction`].create({
            data: { customerId: o.customerId, type: 'RETURNED_GOOD', quantity: retGood, reason: `Order ${o.id} (Payment Settlement)` }
          });
          const emptyBottleItem = await tx[`${prefix}Item`].findFirst({
            where: { type: 'RAW_MATERIAL', name: { contains: 'empty', mode: 'insensitive' } }
          });
          if (emptyBottleItem) {
            await tx[`${prefix}Item`].update({
              where: { id: emptyBottleItem.id },
              data: { 
                cachedQty: { increment: retGood },
                factoryQty: { increment: retGood }
              }
            });
            await tx[`${prefix}InventoryTransaction`].create({
              data: { itemId: emptyBottleItem.id, quantity: retGood, direction: 'IN', reason: 'BOTTLE_RETRIEVAL', refType: 'ORDER', refId: o.id, location: 'FACTORY' }
            });
          }
        }
        if (retBroken > 0) {
          await tx[`${prefix}BottleTransaction`].create({
            data: { customerId: o.customerId, type: 'RETURNED_BROKEN', quantity: retBroken, reason: `Order ${o.id} (Payment Settlement)` }
          });
        }
      }

      // Update order payment status
      const newTotalPaid = alreadyPaid + cash;
      const newPaymentStatus = newTotalPaid >= orderTotal ? 'PAID' : (newTotalPaid > 0 ? 'PARTIAL' : 'UNPAID');

      const updated = await tx[`${prefix}Order`].update({
        where: { id },
        data: { paymentStatus: newPaymentStatus },
        include: { items: { include: { item: true } }, customer: true, payments: true, deliveries: true }
      });

      await tx[`${prefix}AuditLog`].create({
        data: {
          action: 'ORDER_PAYMENT_SETTLED',
          entityType: 'Order',
          entityId: updated.id,
          performedBy: req.user?.id || 'Unknown',
          details: JSON.stringify({ 
            cashReceived: cash, 
            newTotalPaid, 
            newPaymentStatus, 
            debtReduction,
            depositRestored,
            bottlesReturnedGood: retGood, 
            bottlesReturnedBroken: retBroken 
          })
        }
      });

      return updated;
    }

    // Validate finished goods stock on Factory Floor for every item in order before processing delivery
    for (const orderItem of o.items) {
      if (orderItem.itemId) {
        const itemObj = await tx[`${prefix}Item`].findUnique({ where: { id: orderItem.itemId } });
        if (itemObj) {
          const factoryStock = Number(itemObj.factoryQty !== undefined && itemObj.factoryQty !== null ? itemObj.factoryQty : itemObj.cachedQty || 0);
          const reqQty = Number(orderItem.quantity || 0);
          if (factoryStock < reqQty) {
            throw new ApiError(
              400,
              `❌ Cannot deliver order: Insufficient Factory Floor stock for "${itemObj.name}". Required: ${reqQty}, Available on Factory Floor: ${factoryStock}. Stock in Warehouse cannot be automatically delivered — please run a Production batch or Transfer Stock from Warehouse to Factory Floor first.`
            );
          }
        }
      }
    }

    // 19L Calculations
    const has19L = o.items.some(i => i.item?.name?.toLowerCase().includes('19l'));
    const qty19L = o.items.filter(i => i.item?.name?.toLowerCase().includes('19l')).reduce((sum, i) => sum + i.quantity, 0) || (has19L ? qty : 0);

    // Soft-block check for bottle returns
    const currentBottles = o.customer.cachedBottleBalance || 0;
    if ((retGood + retBroken > currentBottles + qty19L) && !bypassBottleCheck) {
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

    if (has19L && qty19L > 0) {
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
        await tx[`${prefix}Item`].update({ where: { id: largeCap.id }, data: { cachedQty: { decrement: qty19L } } });
        await tx[`${prefix}InventoryTransaction`].create({
          data: { itemId: largeCap.id, quantity: qty19L, direction: 'OUT', reason: '19L_DELIVERY_CAPS', refType: 'ORDER', refId: o.id }
        });
      }

      // Deduct Mineral Fraction (24L treated water per bottle / 15,141L per mineral set per owner specs)
      const WATER_PER_BOTTLE = 24;
      const WATER_PER_MINERAL_SET = 15141;
      const mineralSetFraction = new Prisma.Decimal(qty19L * WATER_PER_BOTTLE).dividedBy(WATER_PER_MINERAL_SET);

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
      await tx[`${prefix}BottleTransaction`].create({
        data: { customerId: o.customerId, type: 'DELIVERED_TO_CUSTOMER', quantity: qty19L, reason: `Order ${o.id}` }
      });
    }

    if (retGood > 0) {
      await tx[`${prefix}BottleTransaction`].create({
        data: { customerId: o.customerId, type: 'RETURNED_GOOD', quantity: retGood, reason: `Order ${o.id}` }
      });
      const emptyBottleItem = await tx[`${prefix}Item`].findFirst({
        where: { type: 'RAW_MATERIAL', name: { contains: 'empty', mode: 'insensitive' } }
      });
      if (emptyBottleItem) {
        await tx[`${prefix}Item`].update({
          where: { id: emptyBottleItem.id },
          data: { 
            cachedQty: { increment: retGood },
            factoryQty: { increment: retGood }
          }
        });
        await tx[`${prefix}InventoryTransaction`].create({
          data: { itemId: emptyBottleItem.id, quantity: retGood, direction: 'IN', reason: 'BOTTLE_RETRIEVAL', refType: 'ORDER', refId: o.id, location: 'FACTORY' }
        });
      }
    }
    if (retBroken > 0) {
      await tx[`${prefix}BottleTransaction`].create({
        data: { customerId: o.customerId, type: 'RETURNED_BROKEN', quantity: retBroken, reason: `Order ${o.id}` }
      });
    }

    // Finished Goods Deductions (deduct exclusively from Factory Floor stock)
    for (const orderItem of o.items) {
      if (orderItem.itemId) {
        const is19LItem = orderItem.item?.name?.toLowerCase().includes('19l');
        const qtyToDeduct = Number(orderItem.quantity || 0);

        await tx[`${prefix}Item`].update({
          where: { id: orderItem.itemId },
          data: { 
            cachedQty: { decrement: qtyToDeduct },
            factoryQty: { decrement: qtyToDeduct }
          }
        });

        await tx[`${prefix}InventoryTransaction`].create({
          data: { 
            itemId: orderItem.itemId, 
            quantity: orderItem.quantity, 
            direction: 'OUT', 
            reason: is19LItem ? '19L_DELIVERY' : 'PET_DELIVERY', 
            refType: 'ORDER', 
            refId: o.id,
            location: 'FACTORY'
          }
        });
      }
    }

    // Update Customer Deposit, Financial Balance (Debt), and Tenant-specific Bottle Holdings
    // ATOMIC OPERATION: Read customer state once and perform single update
    const unpaidAmount = Math.max(0, orderTotal - cash);
    
    const customerSnapshot = await tx[`${prefix}Customer`].findUnique({
      where: { id: o.customerId },
      select: { deposit: true }
    });
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

    const isWadaana = prefix === 'wadaana';
    const customerUpdateData = {
      lastDeliveryAt: new Date()
    };

    // Financial updates
    if (depositDeduction > 0) {
      customerUpdateData.deposit = { decrement: depositDeduction };
    }
    if (debtAddition > 0) {
      customerUpdateData.currentBalance = { increment: debtAddition };
    }

    // Bottle balance updates
    if (!isWadaana) {
      customerUpdateData.cachedBottleBalance = { increment: qty19L - retGood - retBroken };
    } else {
      // Wadaana PET bottle customer tracking
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

    // Execute single atomic customer update
    await tx[`${prefix}Customer`].update({
      where: { id: o.customerId },
      data: customerUpdateData
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
        performedBy: req.user?.name || req.user?.id?.substring(0, 6) || 'Admin',
        details: `Order #${updated.id.slice(0, 6).toUpperCase()} delivered to ${o.customer?.name || 'Customer'} • Cash Received: Rs. ${cash.toLocaleString()}${retGood > 0 ? ` (${retGood} bottles returned)` : ''}`
      }
    });

    return updated;
  }, { maxWait: 10000, timeout: 30000 });

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

  // Soft delete / mark order as CANCELLED
  await prisma[`${prefix}Order`].update({
    where: { id },
    data: { 
      deliveryStatus: 'CANCELLED',
      paymentStatus: 'UNPAID'
    }
  });

  await prisma[`${prefix}AuditLog`].create({
    data: {
      action: 'ORDER_CANCELLED',
      entityType: 'Order',
      entityId: id,
      performedBy: req.user?.id || 'Unknown',
      details: `Order ${id} soft-deleted and marked as CANCELLED`
    }
  });

  broadcastDashboardUpdate();
  res.json({ success: true, message: 'Order marked as cancelled' });
});

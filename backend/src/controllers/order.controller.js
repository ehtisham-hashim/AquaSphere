import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../utils/eventBus.js';

export const getOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.aquasphereOrder.findMany({
    include: { customer: true, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json({ success: true, data: orders });
});

export const createOrder = asyncHandler(async (req, res) => {
  const { customerId, type, items, expectedDelivery, remarks, paymentStatus } = req.body; 
  if (!customerId || !type || !items?.length) throw new ApiError(400, 'Invalid payload');

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.aquasphereOrder.create({
      data: { 
        customerId, 
        type,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        remarks,
        paymentStatus: paymentStatus || 'UNPAID'
      }
    });

    for (const i of items) {
      await tx.aquasphereOrderItem.create({
        data: {
          orderId: o.id,
          itemId: i.itemId,
          quantity: parseInt(i.quantity),
          price: parseFloat(i.price)
        }
      });
    }
    return o;
  });

  res.status(201).json({ success: true, data: order });
});

export const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { expectedDelivery, remarks } = req.body;

  const order = await prisma.aquasphereOrder.findUnique({ where: { id } });
  if (!order) throw new ApiError(404, 'Order not found');
  
  if (order.deliveryStatus === 'DELIVERED') {
    throw new ApiError(400, 'Cannot edit a delivered order');
  }

  const updated = await prisma.aquasphereOrder.update({
    where: { id },
    data: {
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      remarks
    }
  });

  res.json({ success: true, data: updated });
});

export const deliverOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { qtyDelivered, bottlesReturnedGood, bottlesReturnedBroken, cashReceived, paymentMethod, remarks } = req.body;

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.aquasphereOrder.findUnique({ where: { id }, include: { items: true } });
    if (!o) throw new ApiError(404, 'Order not found');

    const qty = parseInt(qtyDelivered || 0);
    const retGood = parseInt(bottlesReturnedGood || 0);
    const retBroken = parseInt(bottlesReturnedBroken || 0);
    const cash = parseFloat(cashReceived || 0);
    const orderTotal = o.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

    await tx.aquasphereDelivery.create({
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
      await tx.aquaspherePayment.create({
        data: {
          orderId: o.id,
          customerId: o.customerId,
          amount: cash,
          type: paymentMethod || 'CASH'
        }
      });
    }

    // Update customer bottle balance (Delivered decreases empty balance, returned increases it)
    const customer = await tx.aquasphereCustomer.findUnique({ where: { id: o.customerId } });
    const newBottleBalance = customer.cachedBottleBalance - qty + retGood + retBroken;
    
    // Update customer financial balance (Total Cost - Cash Paid)
    const newFinancialBalance = parseFloat(customer.cachedBalance) + (orderTotal - cash);

    await tx.aquasphereCustomer.update({
      where: { id: o.customerId },
      data: { 
        cachedBottleBalance: newBottleBalance,
        cachedBalance: newFinancialBalance
      }
    });

    const updated = await tx.aquasphereOrder.update({
      where: { id },
      data: { deliveryStatus: 'DELIVERED', paymentStatus: cash >= orderTotal ? 'PAID' : (cash > 0 ? 'PARTIAL' : 'UNPAID') }
    });

    return updated;
  });

  eventBus.emit('DashboardDataChanged');
  res.json({ success: true, data: order });
});

import { useState, useEffect, useMemo } from 'react';
import { DollarSign, CheckCircle2, User, Loader2, ShoppingBag, Zap, Printer, Plus, Minus, Trash2, AlertCircle } from 'lucide-react';
import { PAYMENT_METHODS } from '../../constants/counterSale';

export default function LogCounterSaleForm({
  liveSaleNumber,
  user,
  liveDateTime,
  finishedGoods = [],
  customers = [],
  handleMultiItemSubmit,
  submitting,
  lastRecordedSale,
  onPrintReceipt
}) {
  // Map of itemId -> quantity
  const [cartMap, setCartMap] = useState({});

  // Auto-select first finished good when list loads
  useEffect(() => {
    if (finishedGoods.length > 0 && Object.keys(cartMap).length === 0) {
      setCartMap({ [finishedGoods[0].id]: 1 });
    }
  }, [finishedGoods]);

  const [amountPaid, setAmountPaid] = useState('');
  const [isAmountPaidManual, setIsAmountPaidManual] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Calculate cart items & total
  const cartItems = useMemo(() => {
    return Object.entries(cartMap)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([itemId, qty]) => {
        const item = finishedGoods.find(i => i.id === itemId) || {
          id: itemId,
          name: 'Item',
          unit: 'units',
          retailPrice: 0,
          cachedQty: 0
        };
        const unitPrice = Number(item.retailPrice || 0);
        const numQty = Number(qty);
        return {
          id: item.id,
          name: item.name,
          unit: item.unit || 'units',
          availableQty: Number(item.cachedQty || 0),
          factoryQty: Number(item.factoryQty || 0),
          warehouseQty: Number(item.warehouseQty || 0),
          quantity: numQty,
          unitPrice,
          lineTotal: numQty * unitPrice
        };
      });
  }, [cartMap, finishedGoods]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [cartItems]);

  // Keep Amount Paid in sync with cart total by default (unless user manually types an amount)
  useEffect(() => {
    if (!isAmountPaidManual) {
      setAmountPaid(String(cartTotal));
    }
  }, [cartTotal, isAmountPaidManual]);

  const toggleItem = (itemId) => {
    setCartMap(prev => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = 1;
      }
      return next;
    });
  };

  const updateItemQty = (itemId, delta) => {
    setCartMap(prev => {
      const next = { ...prev };
      const current = Number(next[itemId] || 0);
      const updated = current + delta;
      if (updated <= 0) {
        delete next[itemId];
      } else {
        next[itemId] = updated;
      }
      return next;
    });
  };

  const setItemQtyDirect = (itemId, valStr) => {
    if (valStr === '') {
      setCartMap(prev => ({ ...prev, [itemId]: '' }));
      return;
    }
    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val >= 0) {
      setCartMap(prev => {
        const next = { ...prev };
        if (val === 0) {
          delete next[itemId];
        } else {
          next[itemId] = val;
        }
        return next;
      });
    }
  };

  // Stock check
  const getStockWarning = (item) => {
    if (!item) return null;
    const requested = Number(cartMap[item.id] || 0);
    const available = Number(item.cachedQty || 0);
    if (requested > available) {
      return `Only ${available} ${item.unit || 'units'} available in stock`;
    }
    return null;
  };

  const hasStockError = cartItems.some(i => i.quantity > i.availableQty);

  // Financial & Debt Calculations
  const numericAmountPaid = parseFloat(amountPaid || 0);
  const unpaidBalance = Math.max(0, cartTotal - numericAmountPaid);
  const isWalkIn = !customerId || !customerId.trim();
  const selectedCustomer = customers.find(c => c.id === customerId);
  const customerBalance = selectedCustomer ? Number(selectedCustomer.currentBalance || 0) : 0;
  const customerLimit = selectedCustomer ? Number(selectedCustomer.creditLimit || 0) : 0;
  const customerDeposit = selectedCustomer ? Number(selectedCustomer.deposit || 0) : 0;
  const projectedBalance = customerBalance + unpaidBalance;
  const isLimitExceeded = !isWalkIn && customerLimit > 0 && projectedBalance > customerLimit;

  // Unpaid debt on walk-in is strictly blocked
  const isWalkInDebtBlocked = isWalkIn && unpaidBalance > 0;

  const onSubmit = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (hasStockError) return;
    if (isWalkInDebtBlocked) return;

    handleMultiItemSubmit({
      items: cartItems.map(i => ({
        itemId: i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      })),
      amountPaid: numericAmountPaid,
      paymentMethod,
      customerId: customerId || null,
      remarks
    });

    // Reset fields for next transaction
    setIsAmountPaidManual(false);
    setRemarks('');
  };

  return (
    <div className="card-surface p-4 w-full space-y-3">
      {/* Top Banner for Last Recorded Sale */}
      {lastRecordedSale && (
        <div className="flex items-center justify-between p-2.5 bg-brand/10 border border-brand/20 rounded-xl text-xs font-bold text-brand animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-brand shrink-0" />
            <span>
              Sale <strong className="font-mono">{lastRecordedSale.saleNumber}</strong> recorded (Rs. {Number(lastRecordedSale.totalAmount || lastRecordedSale.cashCollected || 0).toLocaleString()}) — Ready for next customer!
            </span>
          </div>
          <button
            type="button"
            onClick={() => onPrintReceipt(lastRecordedSale)}
            className="btn-primary text-xs py-1 px-2.5"
          >
            <Printer size={13} /> Print Receipt
          </button>
        </div>
      )}

      {/* Compact Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-semibold">Sale ID: <strong className="font-mono text-brand">{liveSaleNumber}</strong></span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-semibold">Cashier: <strong className="text-slate-800">{user?.name || user?.role}</strong></span>
        </div>
        <div className="text-slate-400 font-mono font-medium text-[11px]">
          {liveDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Main POS Interface — 2 Column Split */}
      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Dynamic Finished Goods Catalog Cards (7 Cols) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              1. Finished Goods Catalog ({finishedGoods.length}) *
            </label>
            <span className="text-[11px] text-slate-400 font-medium">Select finished products to add to bill</span>
          </div>

          {finishedGoods.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
              No active finished goods found in catalog. Add finished products in the Inventory module first.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[440px] overflow-y-auto pr-1">
              {finishedGoods.map(item => {
                const inCart = Boolean(cartMap[item.id]);
                const qty = cartMap[item.id] !== undefined ? cartMap[item.id] : 0;
                const warning = getStockWarning(item);
                const price = Number(item.retailPrice || 0);

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      inCart 
                        ? 'bg-brand/5 border-brand ring-2 ring-brand/20 shadow-2xs' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none grow min-w-0">
                        <input 
                          type="checkbox" 
                          checked={inCart} 
                          onChange={() => toggleItem(item.id)}
                          className="w-4 h-4 accent-brand rounded cursor-pointer shrink-0"
                        />
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                          <div className="text-[11px] font-mono font-bold text-brand">
                            Rs. {price.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/{item.unit || 'unit'}</span>
                          </div>
                        </div>
                      </label>

                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                        inCart ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {Number(item.cachedQty || 0)} {item.unit || 'pk'}
                      </span>
                    </div>

                    {/* Quantity Stepper when selected */}
                    {inCart && (
                      <div className="mt-2 pt-2 border-t border-brand/20 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            className="w-12 text-center font-mono font-bold text-xs text-slate-900 border border-slate-200 rounded-lg p-0.5 bg-white outline-none"
                            value={qty}
                            onChange={(e) => setItemQtyDirect(item.id, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-brand hover:opacity-90 text-white flex items-center justify-center font-bold text-xs"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {[1, 5, 10].map(q => (
                            <button
                              type="button"
                              key={q}
                              onClick={() => setItemQtyDirect(item.id, q)}
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                                qty === q 
                                  ? 'bg-brand text-white border-brand' 
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {warning && (
                      <div className="mt-1 text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <ShoppingBag size={11} /> {warning}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Bill & Streamlined Payment Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-brand" /> Bill Summary ({cartItems.length})
            </span>
            <span className="text-base font-mono font-bold text-brand">Rs. {cartTotal.toLocaleString()}</span>
          </div>

          {/* Itemized Cart List */}
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
            {cartItems.length === 0 ? (
              <div className="text-center py-4 text-slate-400 font-medium text-xs">Select finished products to add to bill</div>
            ) : cartItems.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-800">{item.name}</span>
                  <span className="text-[11px] font-mono text-slate-500 block">{item.quantity} × Rs. {item.unitPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">Rs. {item.lineTotal.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => updateItemQty(item.id, -item.quantity)}
                    className="text-slate-400 hover:text-red-600 p-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Streamlined Payment Section */}
          <div className="space-y-2 border-t border-slate-200 pt-2 text-xs">
            {/* Amount Paid (Tendered) */}
            <div>
              <label className="block font-medium text-slate-700 mb-1 text-[11px]">Amount Paid / Received (Rs)</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand" size={14}/>
                <input 
                  type="number" 
                  step="1" 
                  min="0"
                  className="input-base pl-7 text-xs font-mono font-bold" 
                  value={amountPaid} 
                  onChange={(e) => {
                    setAmountPaid(e.target.value);
                    setIsAmountPaidManual(true);
                  }} 
                  placeholder="0"
                />
              </div>
            </div>

            {/* Unpaid Balance / Debt Live Status */}
            {unpaidBalance > 0 ? (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-semibold flex items-center justify-between">
                <span>Unpaid Balance:</span>
                <span className="font-mono font-bold text-amber-900">Rs. {unpaidBalance.toLocaleString()}</span>
              </div>
            ) : (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold flex items-center justify-between">
                <span>Payment Status:</span>
                <span className="font-bold">Fully Paid</span>
              </div>
            )}

            {/* Customer Profile Selector */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1 text-[11px] flex items-center gap-1">
                <User size={13} className={unpaidBalance > 0 ? 'text-amber-600' : 'text-slate-500'} />
                Customer Account {unpaidBalance > 0 ? <span className="text-amber-600 font-bold">* REQUIRED FOR UNPAID BALANCE</span> : '(Optional)'}
              </label>

              <select
                className="select-base text-xs font-medium"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">-- Walk-In Customer (Must Pay in Full) --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) — Debt: Rs {Number(c.currentBalance || 0).toLocaleString()} {Number(c.deposit || 0) > 0 ? `• Dep: Rs ${Number(c.deposit).toLocaleString()}` : ''}
                  </option>
                ))}
              </select>

              {/* Warnings and Information */}
              {isWalkInDebtBlocked && (
                <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11px] font-medium flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Walk-in cash customers cannot leave unpaid balances. Select a registered customer account to record debt.</span>
                </div>
              )}

              {!isWalkIn && unpaidBalance > 0 && (
                <div className="mt-1.5 p-2 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 text-[11px]">
                  <div>Rs. <strong>{unpaidBalance.toLocaleString()}</strong> will be added to <strong>{selectedCustomer?.name}</strong>'s debt.</div>
                  <div className="text-[10px] text-sky-600 font-mono mt-0.5">
                    New Balance: Rs. {projectedBalance.toLocaleString()} {customerLimit > 0 && `(Limit: Rs. ${customerLimit.toLocaleString()})`}
                  </div>
                </div>
              )}

              {isLimitExceeded && (
                <p className="text-[11px] font-semibold text-amber-600 mt-1">
                  ⚠️ Credit limit (Rs. {customerLimit.toLocaleString()}) will be exceeded.
                </p>
              )}
            </div>

            {/* Payment Method & Notes */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-0.5 text-[10px] uppercase">Payment Method</label>
                <select
                  className="select-base text-xs py-1.5"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-0.5 text-[10px] uppercase">Remarks</label>
                <input 
                  type="text" 
                  className="input-base text-xs py-1.5" 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)} 
                  placeholder="Notes..."
                />
              </div>
            </div>

            {/* Fast 1-Click Submit Button */}
            <button 
              type="submit" 
              disabled={submitting || cartItems.length === 0 || isWalkInDebtBlocked || hasStockError}
              className="btn-primary w-full py-2.5 text-xs uppercase tracking-wider font-bold mt-2 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} className="fill-white" />}
              Record Sale (Bill: Rs. {cartTotal.toLocaleString()} • Paid: Rs. {numericAmountPaid.toLocaleString()})
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

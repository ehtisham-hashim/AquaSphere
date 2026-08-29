import { useState, useEffect, useMemo } from 'react';
import { DollarSign, CheckCircle2, User, Loader2, ShoppingBag, Zap, Printer, Plus, Minus, Trash2 } from 'lucide-react';
import { COUNTER_PRODUCTS, PAYMENT_METHODS } from '../../constants/counterSale';

export default function LogCounterSaleForm({
  liveSaleNumber,
  user,
  liveDateTime,
  available19LBottles,
  available05LPacks,
  totalBottles05L,
  available15LPacks,
  totalBottles15L,
  customers,
  handleMultiItemSubmit,
  submitting,
  lastRecordedSale,
  onPrintReceipt
}) {
  // Map of productId -> quantity (e.g. { PACK_05L: 1, BOTTLE_19L: 2 })
  const [cartMap, setCartMap] = useState({ PACK_05L: 1 });
  
  const [cashCollected, setCashCollected] = useState('');
  const [creditAmount, setCreditAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Calculate cart items & totals
  const cartItems = useMemo(() => {
    return Object.entries(cartMap)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([id, qty]) => {
        const prod = COUNTER_PRODUCTS.find(p => p.id === id) || { id, name: id, defaultPrice: 0, unitLabel: 'Units' };
        const price = prod.defaultPrice || 0;
        const numQty = Number(qty);
        return {
          id: prod.id,
          name: prod.name,
          unitLabel: prod.unitLabel,
          productType: prod.id,
          productQty: numQty,
          unitPrice: price,
          lineTotal: numQty * price
        };
      });
  }, [cartMap]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [cartItems]);

  // Keep Cash Collected in sync with cart total by default (unless user overrides)
  const [isCashManual, setIsCashManual] = useState(false);
  useEffect(() => {
    if (!isCashManual) {
      setCashCollected(String(cartTotal));
    }
  }, [cartTotal, isCashManual]);

  const toggleProduct = (prodId) => {
    setCartMap(prev => {
      const next = { ...prev };
      if (next[prodId]) {
        delete next[prodId];
      } else {
        next[prodId] = 1;
      }
      return next;
    });
    setIsCashManual(false);
  };

  const updateProductQty = (prodId, delta) => {
    setCartMap(prev => {
      const next = { ...prev };
      const current = next[prodId] || 0;
      const updated = current + delta;
      if (updated <= 0) {
        delete next[prodId];
      } else {
        next[prodId] = updated;
      }
      return next;
    });
    setIsCashManual(false);
  };

  const setProductQtyDirect = (prodId, qty) => {
    setCartMap(prev => {
      const next = { ...prev };
      const val = parseInt(qty, 10);
      if (isNaN(val) || val <= 0) {
        delete next[prodId];
      } else {
        next[prodId] = val;
      }
      return next;
    });
    setIsCashManual(false);
  };

  // Stock validations per product
  const getStockWarning = (prodId, qty) => {
    if (qty <= 0) return null;
    if (prodId === 'PACK_05L' && qty > Math.floor(available05LPacks)) {
      return `Only ${Math.floor(available05LPacks)} pk available`;
    }
    if (prodId === 'SINGLE_05L' && qty > totalBottles05L) {
      return `Only ${totalBottles05L} btl available`;
    }
    if (prodId === 'PACK_15L' && qty > Math.floor(available15LPacks)) {
      return `Only ${Math.floor(available15LPacks)} pk available`;
    }
    if (prodId === 'SINGLE_15L' && qty > totalBottles15L) {
      return `Only ${totalBottles15L} btl available`;
    }
    if (prodId === 'BOTTLE_19L' && qty > available19LBottles) {
      return `Only ${available19LBottles} btl available`;
    }
    return null;
  };

  const hasStockError = cartItems.some(i => Boolean(getStockWarning(i.id, i.productQty)));

  const numericCredit = parseFloat(creditAmount || 0);
  const isCreditSale = numericCredit > 0;
  const selectedCustomer = customers.find(c => c.id === customerId);
  const customerBalance = selectedCustomer ? Number(selectedCustomer.currentBalance || 0) : 0;
  const customerLimit = selectedCustomer ? Number(selectedCustomer.creditLimit || 0) : 0;
  const projectedBalance = customerBalance + numericCredit;
  const isCreditLimitExceeded = isCreditSale && customerLimit > 0 && projectedBalance > customerLimit;

  const onSubmit = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (hasStockError) return;

    handleMultiItemSubmit({
      items: cartItems.map(i => ({ productType: i.productType, productQty: i.productQty })),
      cashCollected: parseFloat(cashCollected || 0),
      creditAmount: numericCredit,
      paymentMethod,
      customerId: numericCredit > 0 ? customerId : (customerId || null),
      remarks
    });

    // Reset cart to default for next customer
    setCartMap({ PACK_05L: 1 });
    setIsCashManual(false);
    setCreditAmount('0');
    setCustomerId('');
    setRemarks('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm w-full space-y-3">
      {/* Top Banner for Last Recorded Sale */}
      {lastRecordedSale && (
        <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>
              Sale <strong className="font-mono">{lastRecordedSale.saleNumber}</strong> recorded (Rs. {(Number(lastRecordedSale.cashCollected || 0) + Number(lastRecordedSale.creditAmount || 0)).toLocaleString()}) — Ready for next customer!
            </span>
          </div>
          <button
            type="button"
            onClick={() => onPrintReceipt(lastRecordedSale)}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
          >
            <Printer size={13} /> Print Receipt
          </button>
        </div>
      )}

      {/* Compact Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-semibold">Sale ID: <strong className="font-mono text-emerald-800">{liveSaleNumber}</strong></span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-semibold">Cashier: <strong className="text-slate-800">{user?.name || user?.role}</strong></span>
        </div>
        <div className="text-slate-400 font-medium text-[11px]">
          {liveDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Main POS Interface — 2 Column Split (Zero Scrolling) */}
      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Multi-Select Product Cards (7 Cols) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              1. Select Products (Checkboxes & Quantities) *
            </label>
            <span className="text-[11px] text-slate-400 font-medium">Click card or checkbox to select</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COUNTER_PRODUCTS.map(prod => {
              const inCart = Boolean(cartMap[prod.id]);
              const qty = cartMap[prod.id] || 0;
              let stockBadge = '';
              if (prod.id === 'PACK_05L') stockBadge = `${Math.floor(available05LPacks)} pk`;
              else if (prod.id === 'SINGLE_05L') stockBadge = `${totalBottles05L} btl`;
              else if (prod.id === 'PACK_15L') stockBadge = `${Math.floor(available15LPacks)} pk`;
              else if (prod.id === 'SINGLE_15L') stockBadge = `${totalBottles15L} btl`;
              else if (prod.id === 'BOTTLE_19L') stockBadge = `${available19LBottles} btl`;

              const warning = getStockWarning(prod.id, qty);

              return (
                <div
                  key={prod.id}
                  className={`p-2.5 rounded-xl border transition-all ${
                    inCart 
                      ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none grow min-w-0">
                      <input 
                        type="checkbox" 
                        checked={inCart} 
                        onChange={() => toggleProduct(prod.id)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 truncate">{prod.name}</div>
                        <div className="text-[11px] font-semibold text-emerald-700">Rs. {prod.defaultPrice}</div>
                      </div>
                    </label>

                    {stockBadge && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        inCart ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {stockBadge}
                      </span>
                    )}
                  </div>

                  {/* Quantity Stepper when selected */}
                  {inCart && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateProductQty(prod.id, -1)}
                          className="w-6 h-6 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          className="w-12 text-center font-black text-xs text-slate-900 border border-emerald-300 rounded-lg p-0.5 bg-white outline-none"
                          value={qty}
                          onChange={(e) => setProductQtyDirect(prod.id, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => updateProductQty(prod.id, 1)}
                          className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {[1, 2, 5, 10].map(q => (
                          <button
                            type="button"
                            key={q}
                            onClick={() => setProductQtyDirect(prod.id, q)}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                              qty === q 
                                ? 'bg-emerald-700 text-white border-emerald-700' 
                                : 'bg-white hover:bg-emerald-100 text-emerald-800 border-emerald-300'
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
        </div>

        {/* RIGHT COLUMN: Live Cart & Instant Checkout Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-emerald-600" /> Cart Summary ({cartItems.length})
            </span>
            <span className="text-base font-black text-emerald-800">Rs. {cartTotal.toLocaleString()}</span>
          </div>

          {/* Itemized Cart List */}
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
            {cartItems.length === 0 ? (
              <div className="text-center py-4 text-slate-400 font-medium text-xs">Select products to add to cart</div>
            ) : cartItems.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800">{item.name}</span>
                  <span className="text-[11px] text-slate-500 font-semibold block">{item.productQty} x Rs. {item.unitPrice}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900">Rs. {item.lineTotal.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => updateProductQty(item.id, -item.productQty)}
                    className="text-slate-400 hover:text-red-600 p-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment & Customer Fields */}
          <div className="space-y-2 border-t border-slate-200 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Cash Collected (Rs)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600" size={14}/>
                  <input 
                    type="number" 
                    step="1" 
                    min="0"
                    className="w-full border border-slate-200 rounded-lg py-1.5 pl-7 pr-2 font-black text-slate-900 text-xs outline-none focus:border-emerald-500 bg-white" 
                    value={cashCollected} 
                    onChange={(e) => {
                      setCashCollected(e.target.value);
                      setIsCashManual(true);
                    }} 
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Credit Amount (Rs)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-600" size={14}/>
                  <input 
                    type="number" 
                    step="1" 
                    min="0"
                    className="w-full border border-slate-200 rounded-lg py-1.5 pl-7 pr-2 font-black text-purple-900 text-xs outline-none focus:border-purple-500 bg-white" 
                    value={creditAmount} 
                    onChange={(e) => setCreditAmount(e.target.value)} 
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Customer Dropdown */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-[11px] flex items-center gap-1">
                <User size={13} className={isCreditSale ? 'text-purple-700' : 'text-slate-500'} />
                Customer Profile {isCreditSale ? <span className="text-purple-700 font-extrabold">* MANDATORY</span> : '(Optional)'}
              </label>

              <select
                className={`w-full border rounded-lg p-2 bg-white text-xs font-semibold outline-none ${
                  isCreditSale ? 'border-purple-300 text-purple-950' : 'border-slate-200 text-slate-800'
                }`}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required={isCreditSale}
              >
                <option value="">-- {isCreditSale ? 'Select Mandatory Customer' : 'Walk-In Cash Customer'} --</option>
                {customers.map(c => (
                   <option key={c.id} value={c.id}>
                     {c.name} ({c.phone}) — Bal: Rs {Number(c.currentBalance || 0).toLocaleString()}
                   </option>
                 ))}
               </select>
              {isCreditLimitExceeded && (
                <p className="text-[11px] font-bold text-amber-600 mt-1">
                  Credit limit (Rs {customerLimit.toLocaleString()}) will be exceeded (Projected: Rs {projectedBalance.toLocaleString()})
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5 text-[10px] uppercase">Payment Method</label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-1.5 bg-white text-xs font-semibold outline-none"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5 text-[10px] uppercase">Remarks</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-lg p-1.5 text-xs outline-none bg-white" 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)} 
                  placeholder="Notes..."
                />
              </div>
            </div>

            {/* 1-Click Fast Record Sale Button */}
            <button 
              type="submit" 
              disabled={submitting || cartItems.length === 0 || (isCreditSale && !customerId) || hasStockError}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="fill-white" />}
              Record Counter Sale (Rs. {cartTotal.toLocaleString()})
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

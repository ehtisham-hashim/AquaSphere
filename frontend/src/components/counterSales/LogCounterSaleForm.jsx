import { useState, useEffect, useMemo } from 'react';
import { DollarSign, CheckCircle2, User, Loader2, ShoppingBag, Zap, Printer, Plus, Minus, Trash2, AlertCircle, Package, Droplets, Info, Shield } from 'lucide-react';
import { PAYMENT_METHODS } from '../../constants/counterSale';

const getPackSize = (item) => {
  if (item.packSize && Number(item.packSize) > 1) return Number(item.packSize);
  const name = (item.name || '').toLowerCase();
  if (name.includes('0.5l') || name.includes('0.5 pet') || name.includes('500ml')) return 12;
  if (name.includes('1.5l') || name.includes('1.5 pet') || name.includes('1500ml')) return 6;
  return Number(item.packSize) || 1;
};

const getDefaultPrice = (item, type) => {
  const packSize = getPackSize(item);
  const baseRetail = Number(item.retailPrice || 0);
  if (type === 'BOTTLE' && packSize > 1) {
    return Math.round(baseRetail / packSize);
  }
  return baseRetail;
};

export default function LogCounterSaleForm({
  liveSaleNumber,
  user,
  liveDateTime,
  finishedGoods = [],
  customers = [],
  handleMultiItemSubmit,
  submitting,
  lastRecordedSale,
  onPrintReceipt,
  loading = false
}) {
  // Map of cartKey -> quantity: e.g. "itemId_PACK" -> 2, "itemId_BOTTLE" -> 5
  const [cartMap, setCartMap] = useState({});

  // Map of cartKey -> overridden price: e.g. "itemId_PACK" -> 360, "itemId_BOTTLE" -> 35
  const [customPrices, setCustomPrices] = useState({});

  // Per-item sale mode: 'NORMAL' | 'REFILL'
  const [itemSaleMode, setItemSaleModeState] = useState({});
  const setItemSaleMode = (itemId, mode) => {
    setItemSaleModeState(prev => ({
      ...prev,
      [itemId]: mode
    }));
  };

  // Standalone extra items (Caps, Delivery, Custom charges)
  const [extraItems, setExtraItems] = useState({});
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  const [extraSeq, setExtraSeq] = useState(0);

  const addExtraItem = (type, name, price) => {
    // If an extra item of same type and name already exists, increment its quantity
    const existingKey = Object.keys(extraItems).find(k => extraItems[k]?.type === type && extraItems[k]?.name === name);
    if (existingKey && cartMap[existingKey]) {
      updateItemQty(existingKey, 1);
      return;
    }
    const nextSeq = extraSeq + 1;
    setExtraSeq(nextSeq);
    const extraKey = `EXTRA_${nextSeq}`;
    setCartMap(prev => ({
      ...prev,
      [extraKey]: 1
    }));
    setCustomPrices(prev => ({
      ...prev,
      [extraKey]: price
    }));
    setExtraItems(prev => ({
      ...prev,
      [extraKey]: { type, name, isExtra: true }
    }));
  };

  const addCustomExtraItem = () => {
    if (!customItemName.trim()) return;
    const price = Math.max(0, parseFloat(customItemPrice) || 0);
    addExtraItem('EXTRA_CHARGE', customItemName.trim(), price);
    setCustomItemName('');
    setCustomItemPrice('');
  };

  const [amountPaid, setAmountPaid] = useState('');
  const [isAmountPaidManual, setIsAmountPaidManual] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');

  const getItemPrice = (item, type) => {
    const key = `${item.id}_${type}`;
    if (customPrices[key] !== undefined && customPrices[key] !== '') {
      return customPrices[key];
    }
    return getDefaultPrice(item, type);
  };

  const handlePriceChange = (cartKey, val) => {
    setCustomPrices(prev => ({
      ...prev,
      [cartKey]: val
    }));
  };

  // Calculate cart items & total
  const cartItems = useMemo(() => {
    const list = [];
    Object.entries(cartMap).forEach(([cartKey, qty]) => {
      const numQty = Number(qty);
      if (numQty <= 0) return;

      if (extraItems[cartKey]) {
        const extra = extraItems[cartKey];
        const customRate = customPrices[cartKey];
        const parsedRate = customRate !== undefined && customRate !== '' ? parseFloat(customRate) : 0;
        const unitPrice = isNaN(parsedRate) ? 0 : parsedRate;
        const saleType = extra.type === 'EXTRA_CAP' ? 'EXTRA_CAP' : 'EXTRA_CHARGE';

        list.push({
          cartKey,
          itemId: null,
          name: extra.name,
          rawItemName: extra.name,
          type: 'EXTRA',
          saleType,
          packSize: 1,
          quantity: numQty,
          unitPrice,
          lineTotal: numQty * unitPrice,
          baseUnitsPerUnit: 0,
          totalBaseUnits: 0,
          availableStock: 999999,
          isExtra: true
        });
        return;
      }

      const separatorIndex = cartKey.lastIndexOf('_');
      const itemId = cartKey.substring(0, separatorIndex);
      const type = cartKey.substring(separatorIndex + 1);

      const item = finishedGoods.find(i => i.id === itemId);
      if (!item) return;

      const packSize = getPackSize(item);
      const isPack = type === 'PACK';
      const isRefill = itemSaleMode[item.id] === 'REFILL';
      const saleType = isRefill ? 'WATER_REFILL' : (isPack ? 'PACK' : 'BOTTLE');

      const defaultRate = getDefaultPrice(item, type);
      const customRate = customPrices[cartKey];
      const parsedRate = customRate !== undefined && customRate !== '' ? parseFloat(customRate) : defaultRate;
      const unitPrice = isNaN(parsedRate) ? defaultRate : parsedRate;

      const baseUnitsPerUnit = isRefill ? 0 : (isPack ? packSize : 1);
      const totalBaseUnits = isRefill ? 0 : (numQty * (isPack ? packSize : 1));

      const displayName = isRefill
        ? `${item.name} (Refill)`
        : type === 'PACK' 
          ? `${item.name} (Pack of ${packSize})` 
          : type === 'BOTTLE' && packSize > 1 
            ? `${item.name} (Loose Bottle)` 
            : item.name;

      list.push({
        cartKey,
        itemId: item.id,
        name: displayName,
        rawItemName: item.name,
        type, // 'PACK' | 'BOTTLE' | 'UNIT'
        saleType,
        packSize,
        quantity: numQty,
        unitPrice,
        lineTotal: numQty * unitPrice,
        baseUnitsPerUnit,
        totalBaseUnits,
        availableStock: Number(item.cachedQty || 0),
        isRefill
      });
    });
    return list;
  }, [cartMap, customPrices, finishedGoods, extraItems, itemSaleMode]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [cartItems]);

  // Keep Amount Paid in sync with cart total by default (unless user manually types an amount)
  useEffect(() => {
    if (!isAmountPaidManual) {
      setAmountPaid(String(cartTotal));
    }
  }, [cartTotal, isAmountPaidManual]);

  const updateItemQty = (cartKey, delta) => {
    setCartMap(prev => {
      const next = { ...prev };
      const current = Number(next[cartKey] || 0);
      const updated = current + delta;
      if (updated <= 0) {
        delete next[cartKey];
        if (extraItems[cartKey]) {
          setExtraItems(ePrev => {
            const eNext = { ...ePrev };
            delete eNext[cartKey];
            return eNext;
          });
        }
      } else {
        next[cartKey] = updated;
      }
      return next;
    });
  };

  const setItemQtyDirect = (cartKey, valStr) => {
    if (valStr === '') {
      setCartMap(prev => {
        const next = { ...prev };
        delete next[cartKey];
        return next;
      });
      return;
    }
    const val = parseInt(valStr, 10);
    setCartMap(prev => {
      const next = { ...prev };
      if (isNaN(val) || val <= 0) {
        delete next[cartKey];
      } else {
        next[cartKey] = val;
      }
      return next;
    });
  };

  // Stock check by base units across both packs and bottles
  const getStockWarning = (item) => {
    if (!item) return null;
    if (itemSaleMode[item.id] === 'REFILL') return null;
    const packSize = getPackSize(item);
    const packQty = Number(cartMap[`${item.id}_PACK`] || 0);
    const bottleQty = Number(cartMap[`${item.id}_BOTTLE`] || (packSize <= 1 ? (cartMap[`${item.id}_UNIT`] || 0) : 0));
    const requestedBaseUnits = (packQty * packSize) + bottleQty;
    const available = Number(item.cachedQty || 0);

    if (requestedBaseUnits > available) {
      return `Stock exceeded: ${requestedBaseUnits} requested, ${available} available`;
    }
    return null;
  };

  const hasStockError = useMemo(() => {
    return finishedGoods.some(item => {
      if (itemSaleMode[item.id] === 'REFILL') return false;
      const packSize = getPackSize(item);
      const packQty = Number(cartMap[`${item.id}_PACK`] || 0);
      const bottleQty = Number(cartMap[`${item.id}_BOTTLE`] || (packSize <= 1 ? (cartMap[`${item.id}_UNIT`] || 0) : 0));
      const requested = (packQty * packSize) + bottleQty;
      return requested > Number(item.cachedQty || 0);
    });
  }, [cartMap, finishedGoods, itemSaleMode]);

  // Financial & Debt Calculations
  const numericAmountPaid = parseFloat(amountPaid || 0);
  const unpaidBalance = Math.max(0, cartTotal - numericAmountPaid);
  const isWalkIn = !customerId || !customerId.trim();
  const selectedCustomer = customers.find(c => c.id === customerId);
  const customerBalance = selectedCustomer ? Number(selectedCustomer.currentBalance || 0) : 0;
  const customerLimit = selectedCustomer ? Number(selectedCustomer.creditLimit || 0) : 0;
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
        itemId: i.itemId,
        name: i.name,
        saleType: i.saleType,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      })),
      amountPaid: numericAmountPaid,
      paymentMethod,
      customerId: customerId || null,
      remarks
    });

    // Reset fields for next transaction
    setCartMap({});
    setCustomPrices({});
    setExtraItems({});
    setItemSaleModeState({});
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
            <span className="text-[11px] text-slate-400 font-medium">Dual pack & loose bottle controls with dynamic rate</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2.5 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-3.5 bg-slate-200 rounded w-28"></div>
                    <div className="h-4 bg-slate-200 rounded w-12"></div>
                  </div>
                  <div className="h-3 bg-slate-200 rounded w-20"></div>
                  <div className="h-8 bg-slate-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : finishedGoods.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
              No active finished goods found in catalog. Add finished products in the Inventory module first.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {finishedGoods.map(item => {
                const packSize = getPackSize(item);
                const isPackItem = packSize > 1;
                const totalStock = Number(item.cachedQty || 0);
                const packsStock = isPackItem ? Math.floor(totalStock / packSize) : 0;
                const looseStock = isPackItem ? (totalStock % packSize) : totalStock;

                const warning = getStockWarning(item);

                // Keys
                const packKey = `${item.id}_PACK`;
                const bottleKey = isPackItem ? `${item.id}_BOTTLE` : `${item.id}_UNIT`;

                const packQty = Number(cartMap[packKey] || 0);
                const bottleQty = Number(cartMap[bottleKey] || 0);

                const currentPackPrice = getItemPrice(item, 'PACK');
                const currentBottlePrice = getItemPrice(item, 'BOTTLE');

                const isItemInCart = packQty > 0 || bottleQty > 0;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isItemInCart 
                        ? 'bg-brand/5 border-brand ring-1 ring-brand/20 shadow-2xs' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Item Title & Stock Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <Package size={14} className="text-brand shrink-0" />
                          <span>{item.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {isPackItem ? (
                            <span>Pack Size: <strong className="font-mono text-slate-700">{packSize} bottles/pack</strong></span>
                          ) : (
                            <span>Unit: <strong className="font-mono text-slate-700">{item.unit || 'Bottle'}</strong></span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isPackItem ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 block">
                              {packsStock} PACKS
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 block">
                              {looseStock} loose
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 block">
                            {totalStock} {item.unit || 'units'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* DUAL CONTROLS FOR PACKS & LOOSE BOTTLES */}
                    {isPackItem ? (
                      <div className="mt-2 space-y-2">
                        {/* 1. Full Pack Control */}
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 shrink-0">Full Pack:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-mono text-slate-500">Rs.</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded bg-white text-slate-800 text-center focus:border-brand focus:ring-1 focus:ring-brand/30"
                                value={currentPackPrice}
                                onChange={(e) => handlePriceChange(packKey, e.target.value)}
                                title="Pack rate"
                              />
                              <span className="text-[10px] text-slate-400">/pk</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateItemQty(packKey, -1)}
                                disabled={packQty <= 0}
                                className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold text-xs"
                                title="Decrease packs"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className={`w-12 text-center font-mono font-bold text-xs border rounded-md p-0.5 ${
                                  packQty > 0 ? 'border-brand bg-white text-brand' : 'border-slate-200 bg-white text-slate-800'
                                }`}
                                value={packQty > 0 ? packQty : ''}
                                onChange={(e) => setItemQtyDirect(packKey, e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => updateItemQty(packKey, 1)}
                                className="w-6 h-6 rounded-md bg-brand hover:opacity-90 text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                                title="Increase packs"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              {[1, 5, 10].map(q => (
                                <button
                                  type="button"
                                  key={q}
                                  onClick={() => updateItemQty(packKey, q)}
                                  className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 transition"
                                  title={`Add +${q} pack(s)`}
                                >
                                  +{q}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 2. Loose Bottle Control */}
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 shrink-0">Loose Bottle:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-mono text-slate-500">Rs.</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded bg-white text-slate-800 text-center focus:border-brand focus:ring-1 focus:ring-brand/30"
                                value={currentBottlePrice}
                                onChange={(e) => handlePriceChange(bottleKey, e.target.value)}
                                title="Loose bottle rate"
                              />
                              <span className="text-[10px] text-slate-400">/btl</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateItemQty(bottleKey, -1)}
                                disabled={bottleQty <= 0}
                                className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold text-xs"
                                title="Decrease loose bottles"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className={`w-12 text-center font-mono font-bold text-xs border rounded-md p-0.5 ${
                                  bottleQty > 0 ? 'border-brand bg-white text-brand' : 'border-slate-200 bg-white text-slate-800'
                                }`}
                                value={bottleQty > 0 ? bottleQty : ''}
                                onChange={(e) => setItemQtyDirect(bottleKey, e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => updateItemQty(bottleKey, 1)}
                                className="w-6 h-6 rounded-md bg-brand hover:opacity-90 text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                                title="Increase loose bottles"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              {[1, 5, 10].map(q => (
                                <button
                                  type="button"
                                  key={q}
                                  onClick={() => updateItemQty(bottleKey, q)}
                                  className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 transition"
                                  title={`Add +${q} bottle(s)`}
                                >
                                  +{q}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* SINGLE CONTROL FOR 19L / STANDARD ITEMS */
                      <div className="mt-2 p-2 rounded-lg bg-slate-50/70 border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 shrink-0">Rate:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-mono text-slate-500">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded bg-white text-slate-800 text-center focus:border-brand focus:ring-1 focus:ring-brand/30"
                              value={currentBottlePrice}
                              onChange={(e) => handlePriceChange(bottleKey, e.target.value)}
                              title="Unit rate"
                            />
                            <span className="text-[10px] text-slate-400">/{item.unit || 'unit'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateItemQty(bottleKey, -1)}
                              disabled={bottleQty <= 0}
                              className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold text-xs"
                              title="Decrease quantity"
                            >
                              <Minus size={11} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              className={`w-12 text-center font-mono font-bold text-xs border rounded-md p-0.5 ${
                                bottleQty > 0 ? 'border-brand bg-white text-brand' : 'border-slate-200 bg-white text-slate-800'
                              }`}
                              value={bottleQty > 0 ? bottleQty : ''}
                              onChange={(e) => setItemQtyDirect(bottleKey, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQty(bottleKey, 1)}
                              className="w-6 h-6 rounded-md bg-brand hover:opacity-90 text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                              title="Increase quantity"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {[1, 5, 10].map(q => (
                              <button
                                type="button"
                                key={q}
                                onClick={() => updateItemQty(bottleKey, q)}
                                className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 transition"
                                title={`Add +${q}`}
                              >
                                +{q}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ADD THIS NEW SECTION - appears below existing controls */}
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-slate-600 font-semibold">Sale Type:</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setItemSaleMode(item.id, 'NORMAL')}
                          className={`px-2 py-1 rounded-md border text-xs font-semibold transition ${
                            itemSaleMode[item.id] !== 'REFILL' && itemSaleMode[item.id] !== 'CAP_ONLY'
                              ? 'bg-brand text-white border-brand'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          Regular Sale
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemSaleMode(item.id, 'REFILL')}
                          className={`px-2 py-1 rounded-md border text-xs font-semibold transition flex items-center gap-1 ${
                            itemSaleMode[item.id] === 'REFILL'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Droplets size={12} /> Water Refill (Customer Bottle)
                        </button>
                      </div>
                    </div>

                    {/* When REFILL mode is active, show info badge */}
                    {itemSaleMode[item.id] === 'REFILL' && (
                      <div className="mt-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 flex items-center gap-1">
                        <Info size={10} />
                        <span>Customer brings bottle • Only water charged • No bottle deduction</span>
                      </div>
                    )}

                    {/* Stock Alert Warning */}
                    {warning && (
                      <div className="mt-2 text-[11px] font-bold text-red-600 flex items-center gap-1 bg-red-50 p-1.5 rounded-lg border border-red-100">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{warning}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* NEW SECTION - Add after finished goods list */}
          <div className="mt-3 p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
            <h4 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
              <Shield size={14} /> Extra Items (Caps, Delivery, etc.)
            </h4>

            <div className="flex flex-wrap gap-2">
              {/* Pre-defined quick add buttons */}
              <button
                type="button"
                onClick={() => addExtraItem('EXTRA_CAP', 'Extra Cap', 10)}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-100 transition flex items-center gap-1"
              >
                <Plus size={12} /> Add Cap (Rs. 10)
              </button>

              <button
                type="button"
                onClick={() => addExtraItem('DELIVERY', 'Delivery Charge', 100)}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition flex items-center gap-1"
              >
                <Plus size={12} /> Delivery Fee (Rs. 100)
              </button>

              {/* Custom item input */}
              <div className="flex gap-1.5 items-center">
                <input
                  type="text"
                  placeholder="Custom item name"
                  className="input-base text-xs py-1 px-2 w-32"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Price"
                  className="input-base text-xs py-1 px-2 w-20"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => addCustomExtraItem()}
                  className="btn-primary text-xs py-1 px-2"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Bill & Streamlined Payment Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-brand" /> Bill Summary ({cartItems.length})
            </span>
            <span className="text-base font-mono font-bold text-brand">Rs. {cartTotal.toLocaleString()}</span>
          </div>

          {/* Itemized Cart List with Inline Editable Price */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
            {cartItems.length === 0 ? (
              <div className="text-center py-5 text-slate-400 font-medium text-xs">
                Select finished products above to build customer invoice
              </div>
            ) : cartItems.map(item => (
              <div key={item.cartKey} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex-1 min-w-0 pr-2">
                  <span className="font-semibold text-slate-800 block truncate text-xs">{item.name}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {item.isExtra ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.cartKey, -1)}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                          title="Decrease quantity"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="font-mono font-bold text-xs min-w-4 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.cartKey, 1)}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                          title="Increase quantity"
                        >
                          <Plus size={10} />
                        </button>
                        <span className="text-[11px] font-mono text-slate-500">× Rs.</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-500">{item.quantity} × Rs.</span>
                    )}
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded bg-slate-50 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand/30 text-center"
                      value={item.unitPrice}
                      onChange={(e) => handlePriceChange(item.cartKey, e.target.value)}
                      title="Adjust rate inline"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-xs">Rs. {item.lineTotal.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => updateItemQty(item.cartKey, -item.quantity)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                    title="Remove item"
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
                  step="any" 
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

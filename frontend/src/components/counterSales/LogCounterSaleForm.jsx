import { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  CheckCircle2, 
  User, 
  Loader2, 
  ShoppingBag, 
  Zap, 
  Printer, 
  Plus, 
  Minus, 
  Trash2, 
  AlertCircle, 
  Package, 
  Droplets, 
  Phone
} from 'lucide-react';
import { PAYMENT_METHODS } from '../../constants/counterSale';

const getPackSize = (item) => {
  if (item.packSize && Number(item.packSize) > 1) return Number(item.packSize);
  const name = (item.name || '').toLowerCase();
  if (name.includes('0.5l') || name.includes('0.5 pet') || name.includes('500ml')) return 12;
  if (name.includes('1.5l') || name.includes('1.5 pet') || name.includes('1500ml')) return 6;
  return Number(item.packSize) || 1;
};

export default function LogCounterSaleForm({
  liveSaleNumber,
  user,
  liveDateTime,
  finishedGoods = [],
  counterRawMaterials = [],
  customers = [],
  handleMultiItemSubmit,
  submitting,
  lastRecordedSale,
  onPrintReceipt,
  loading = false,
  onManageSupplies = null
}) {
  // Map of cartKey -> quantity: e.g. "itemId_PACK" -> 2, "itemId_UNIT" -> 5, "itemId_RAW" -> 10
  const [cartMap, setCartMap] = useState({});

  // Map of cartKey -> overridden price: e.g. "itemId_PACK" -> 360
  const [customPrices, setCustomPrices] = useState({});

  // Water refill mode: '19L' | 'CUSTOM'
  const [waterMode, setWaterMode] = useState('19L');

  // Dedicated 19L Water Refill (Customer Bottle - 0 bottle stock deducted)
  const [refillQty, setRefillQty] = useState(0);
  const [refillPrice, setRefillPrice] = useState(80);

  // Dedicated Custom Water Litres
  const [customWaterLitres, setCustomWaterLitres] = useState(0);
  const [customWaterRate, setCustomWaterRate] = useState(10);

  // Standalone extra items (Delivery fee, custom charges)
  const [extraItems, setExtraItems] = useState({});
  const [extraSeq, setExtraSeq] = useState(0);

  // Payment & Customer state
  const [amountPaid, setAmountPaid] = useState('');
  const [isAmountPaidManual, setIsAmountPaidManual] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Default refill price from catalog
  useEffect(() => {
    const defaultRefillItem = finishedGoods.find(i => 
      (i.name || '').toLowerCase().includes('19') || 
      (i.name || '').toLowerCase().includes('refill')
    );
    if (defaultRefillItem && Number(defaultRefillItem.retailPrice) > 0) {
      setRefillPrice(prev => (prev === 80 ? Number(defaultRefillItem.retailPrice) : prev));
    }
  }, [finishedGoods]);

  // When customer changes
  const handleCustomerChange = (newCustId) => {
    setCustomerId(newCustId);
  };

  const addExtraItem = (type, name, price) => {
    const existingKey = Object.keys(extraItems).find(k => extraItems[k]?.type === type && extraItems[k]?.name === name);
    if (existingKey && cartMap[existingKey]) {
      updateItemQty(existingKey, 1);
      return;
    }
    const nextSeq = extraSeq + 1;
    setExtraSeq(nextSeq);
    const extraKey = `EXTRA_${nextSeq}`;
    setCartMap(prev => ({ ...prev, [extraKey]: 1 }));
    setCustomPrices(prev => ({ ...prev, [extraKey]: price }));
    setExtraItems(prev => ({ ...prev, [extraKey]: { type, name, isExtra: true } }));
  };

  const getItemPrice = (item, typeKey = 'PACK') => {
    const key = `${item.id}_${typeKey}`;
    if (customPrices[key] !== undefined && customPrices[key] !== '') {
      return customPrices[key];
    }
    const packSize = getPackSize(item);
    if (typeKey === 'BOTTLE') {
      return Math.round(Number(item.retailPrice || 0) / packSize) || 30;
    }
    return Number(item.retailPrice || 0);
  };

  const handlePriceChange = (cartKey, val) => {
    if (cartKey === 'WATER_REFILL') {
      setRefillPrice(val);
      return;
    }
    if (cartKey === 'CUSTOM_WATER') {
      setCustomWaterRate(val);
      return;
    }
    setCustomPrices(prev => ({ ...prev, [cartKey]: val }));
  };

  // Compile full cart list
  const cartItems = useMemo(() => {
    const list = [];

    // 1. Water Refill
    if (refillQty > 0) {
      const refill19LItem = finishedGoods.find(i => 
        (i.name || '').toLowerCase().includes('19') || 
        (i.name || '').toLowerCase().includes('refill')
      ) || finishedGoods[0];
      const parsedRefillPrice = Number(refillPrice) >= 0 ? Number(refillPrice) : 80;
      list.push({
        cartKey: 'WATER_REFILL',
        itemId: refill19LItem ? refill19LItem.id : null,
        name: `19L Water Refill (${refillQty}x)`,
        type: 'REFILL',
        saleType: 'WATER_REFILL',
        packSize: 1,
        quantity: refillQty,
        unitPrice: parsedRefillPrice,
        lineTotal: refillQty * parsedRefillPrice,
        baseUnitsPerUnit: 0,
        totalBaseUnits: 0,
        availableStock: 999999,
        isRefill: true,
        litres: refillQty * 24
      });
    }

    // 2. Custom Water Litres
    if (customWaterLitres > 0) {
      const waterItem = finishedGoods.find(i => 
        (i.name || '').toLowerCase().includes('water') || 
        (i.name || '').toLowerCase().includes('bulk')
      ) || finishedGoods[0];
      const parsedRate = Number(customWaterRate) >= 0 ? Number(customWaterRate) : 10;
      list.push({
        cartKey: 'CUSTOM_WATER',
        itemId: waterItem ? waterItem.id : null,
        name: `Custom Water (${customWaterLitres}L)`,
        type: 'WATER',
        saleType: 'CUSTOM_WATER',
        packSize: 1,
        quantity: customWaterLitres,
        unitPrice: parsedRate,
        lineTotal: customWaterLitres * parsedRate,
        baseUnitsPerUnit: 0,
        totalBaseUnits: 0,
        availableStock: 999999,
        isCustomWater: true,
        litres: customWaterLitres
      });
    }

    // 3. Finished Goods & Raw Materials
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

      if (type === 'RAW') {
        const rawItem = counterRawMaterials.find(i => i.id === itemId);
        if (!rawItem) return;

        const defaultRate = Number(rawItem.retailPrice || 0);
        const customRate = customPrices[cartKey];
        const parsedRate = customRate !== undefined && customRate !== '' ? parseFloat(customRate) : defaultRate;
        const unitPrice = isNaN(parsedRate) ? defaultRate : parsedRate;

        list.push({
          cartKey,
          itemId: rawItem.id,
          name: `${rawItem.name}`,
          type: 'RAW',
          saleType: 'RAW_MATERIAL',
          packSize: 1,
          quantity: numQty,
          unitPrice,
          lineTotal: numQty * unitPrice,
          baseUnitsPerUnit: 1,
          totalBaseUnits: numQty,
          availableStock: Number(rawItem.cachedQty || 0),
          isRawMaterial: true
        });
        return;
      }

      // Finished goods: PACK, BOTTLE, or UNIT
      const item = finishedGoods.find(i => i.id === itemId);
      if (!item) return;

      const packSize = getPackSize(item);
      const isPack = type === 'PACK';
      const isBottle = type === 'BOTTLE';
      const saleType = isPack ? 'PACK' : (isBottle ? 'BOTTLE' : 'UNIT');

      const defaultRate = isBottle
        ? (Math.round(Number(item.retailPrice || 0) / packSize) || 30)
        : Number(item.retailPrice || 0);
      const customRate = customPrices[cartKey];
      const parsedRate = customRate !== undefined && customRate !== '' ? parseFloat(customRate) : defaultRate;
      const unitPrice = isNaN(parsedRate) ? defaultRate : parsedRate;

      const baseUnitsPerUnit = isPack ? packSize : 1;
      const totalBaseUnits = numQty * baseUnitsPerUnit;
      let displayName;
      if (isPack) {
        displayName = `${item.name} (${numQty} Pack${numQty > 1 ? 's' : ''})`;
      } else if (isBottle) {
        displayName = `${item.name} (${numQty} Loose Bottle${numQty > 1 ? 's' : ''})`;
      } else {
        displayName = item.name;
      }

      list.push({
        cartKey,
        itemId: item.id,
        name: displayName,
        type: saleType,
        saleType,
        packSize: isPack ? packSize : 1,
        quantity: numQty,
        unitPrice,
        lineTotal: numQty * unitPrice,
        baseUnitsPerUnit,
        totalBaseUnits,
        availableStock: Number(item.cachedQty || 0),
        isRefill: false
      });
    });

    return list;
  }, [cartMap, customPrices, finishedGoods, counterRawMaterials, extraItems, refillQty, refillPrice, customWaterLitres, customWaterRate]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [cartItems]);

  // Keep Amount Paid synced with cartTotal by default
  useEffect(() => {
    if (!isAmountPaidManual) {
      setAmountPaid(String(cartTotal));
    }
  }, [cartTotal, isAmountPaidManual]);

  const updateItemQty = (cartKey, delta) => {
    if (cartKey === 'WATER_REFILL') {
      setRefillQty(prev => Math.max(0, prev + delta));
      return;
    }
    if (cartKey === 'CUSTOM_WATER') {
      setCustomWaterLitres(prev => Math.max(0, Math.round((prev + delta) * 10) / 10));
      return;
    }
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

  // Stock check by base units with crystal clear transparent math
  const getStockWarning = (item) => {
    if (!item) return null;
    const packSize = getPackSize(item);
    const isPack = packSize > 1;
    const totalAvail = Number(item.cachedQty || 0);
    const availPacks = isPack ? Math.floor(totalAvail / packSize) : totalAvail;

    const packQty = Number(cartMap[`${item.id}_PACK`] || 0);
    const bottleQty = Number(cartMap[`${item.id}_BOTTLE`] || 0) + Number(cartMap[`${item.id}_UNIT`] || 0);
    const requestedBaseUnits = (packQty * packSize) + bottleQty;

    if (requestedBaseUnits > totalAvail) {
      if (isPack) {
        const looseStock = totalAvail % packSize;
        return `Requested ${packQty > 0 ? `${packQty} Packs` : ''}${bottleQty > 0 ? ` + ${bottleQty} Loose` : ''} • System has ${availPacks} Packs${looseStock > 0 ? ` + ${looseStock} loose` : ''} recorded.`;
      }
      return `Requested ${requestedBaseUnits} • System has ${totalAvail} recorded.`;
    }
    return null;
  };

  const hasStockDeficit = useMemo(() => {
    const hasFgDeficit = finishedGoods.some(item => {
      const packSize = getPackSize(item);
      const isPack = packSize > 1;
      const packQty = Number(cartMap[`${item.id}_PACK`] || 0);
      const bottleQty = Number(cartMap[`${item.id}_BOTTLE`] || 0) + Number(cartMap[`${item.id}_UNIT`] || 0);
      const requested = (packQty * packSize) + bottleQty;
      return requested > Number(item.cachedQty || 0);
    });
    const hasRawDeficit = counterRawMaterials.some(item => {
      const requested = Number(cartMap[`${item.id}_RAW`] || 0);
      return requested > Number(item.cachedQty || 0);
    });
    return hasFgDeficit || hasRawDeficit;
  }, [cartMap, finishedGoods, counterRawMaterials]);

  const [allowStockOverride, setAllowStockOverride] = useState(false);

  // Financial status
  const numericAmountPaid = parseFloat(amountPaid || 0);
  const unpaidBalance = Math.max(0, cartTotal - numericAmountPaid);
  const isWalkIn = !customerId || !customerId.trim();
  const selectedCustomer = customers.find(c => c.id === customerId);
  const customerBalance = selectedCustomer ? Number(selectedCustomer.currentBalance || 0) : 0;
  const projectedBalance = customerBalance + unpaidBalance;
  const isWalkInDebtBlocked = isWalkIn && unpaidBalance > 0;

  const onSubmit = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (hasStockDeficit && !allowStockOverride) return;
    if (isWalkInDebtBlocked) return;

    handleMultiItemSubmit({
      items: cartItems.map(i => ({
        itemId: i.itemId,
        name: i.name,
        saleType: i.saleType,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        litres: i.litres
      })),
      amountPaid: numericAmountPaid,
      paymentMethod,
      customerId: customerId || null,
      remarks,
      allowNegativeStock: allowStockOverride
    });

    // Instant reset
    setCartMap({});
    setCustomPrices({});
    setExtraItems({});
    setRefillQty(0);
    setCustomWaterLitres(0);
    setIsAmountPaidManual(false);
    setAllowStockOverride(false);
    setRemarks('');
  };

  return (
    <div className="card-surface p-3.5 w-full space-y-3">
      {/* Top Banner for Last Recorded Sale */}
      {lastRecordedSale && (
        <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>
              Sale <strong className="font-mono">{lastRecordedSale.saleNumber}</strong> logged (Rs. {Number(lastRecordedSale.totalAmount || lastRecordedSale.cashCollected || 0).toLocaleString()})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onPrintReceipt(lastRecordedSale)}
            className="btn-primary text-xs py-0.5 px-2.5 flex items-center gap-1"
          >
            <Printer size={12} /> Print Receipt
          </button>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-slate-500">ID: <strong className="font-mono text-brand">{liveSaleNumber}</strong></span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">Cashier: <strong className="text-slate-800">{user?.name || 'Staff'}</strong></span>
        </div>
        <div className="text-slate-400 font-mono text-[11px]">
          {liveDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* 2-Grid System on Desktop, Simple Grid on Mobile */}
      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* LEFT COLUMN: Products Catalog & Dispenser */}
        <div className="space-y-3">
          
          {/* 1. Finished Goods (Full Packs Only for PET, Units for 19L) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Finished Goods
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {finishedGoods.length} products
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(idx => (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white animate-pulse h-14"></div>
                ))}
              </div>
            ) : finishedGoods.length === 0 ? (
              <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs">
                No finished goods available.
              </div>
            ) : (
              <div className="space-y-2">
                {finishedGoods.map(item => {
                  const packSize = getPackSize(item);
                  const isPack = packSize > 1;
                  const totalStock = Number(item.cachedQty || 0);
                  const packsStock = isPack ? Math.floor(totalStock / packSize) : totalStock;
                  const warning = getStockWarning(item);

                  if (isPack) {
                    const packKey = `${item.id}_PACK`;
                    const bottleKey = `${item.id}_BOTTLE`;
                    const currentPackQty = Number(cartMap[packKey] || 0);
                    const currentBottleQty = Number(cartMap[bottleKey] || 0);
                    const isInCart = currentPackQty > 0 || currentBottleQty > 0;
                    const packPrice = getItemPrice(item, 'PACK');
                    const bottlePrice = getItemPrice(item, 'BOTTLE');

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-lg border transition-all ${
                          isInCart 
                            ? 'bg-brand/5 border-brand ring-1 ring-brand/20' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Header: Title & Total Stock */}
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                              <Package size={14} className="text-brand shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Recorded Stock: <strong className={packsStock <= 0 ? 'text-rose-600' : 'text-slate-700'}>
                                {packsStock} Packs
                              </strong>
                              {totalStock % packSize > 0 && (
                                <span className="ml-1 text-slate-500 font-normal">({totalStock % packSize} loose)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Row 1: Full Pack Control */}
                        <div className="pt-2 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                              Pack of {packSize}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Full Pack Rate</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-mono text-slate-400">Rs</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded bg-slate-50 text-slate-800 text-center focus:bg-white focus:border-brand"
                              value={packPrice}
                              onChange={(e) => handlePriceChange(packKey, e.target.value)}
                              title="Pack Rate"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => updateItemQty(packKey, -1)}
                                disabled={currentPackQty <= 0}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold text-xs"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className={`w-11 text-center font-mono font-bold text-xs border rounded p-0.5 ${
                                  currentPackQty > 0 ? 'border-brand bg-white text-brand' : 'border-slate-200 bg-white text-slate-700'
                                }`}
                                value={currentPackQty > 0 ? currentPackQty : ''}
                                onChange={(e) => setItemQtyDirect(packKey, e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => updateItemQty(packKey, 1)}
                                className="w-6 h-6 rounded bg-brand hover:opacity-90 text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            <div className="hidden sm:flex items-center gap-1">
                              {[1, 5, 10].map(q => (
                                <button
                                  type="button"
                                  key={q}
                                  onClick={() => updateItemQty(packKey, q)}
                                  className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 transition"
                                >
                                  +{q}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Loose Bottle Control */}
                        <div className="pt-2 mt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                              Loose Bottle
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Single Bottle Rate</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-mono text-slate-400">Rs</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded bg-slate-50 text-slate-800 text-center focus:bg-white focus:border-brand"
                              value={bottlePrice}
                              onChange={(e) => handlePriceChange(bottleKey, e.target.value)}
                              title="Bottle Rate"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => updateItemQty(bottleKey, -1)}
                                disabled={currentBottleQty <= 0}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold text-xs"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className={`w-11 text-center font-mono font-bold text-xs border rounded p-0.5 ${
                                  currentBottleQty > 0 ? 'border-brand bg-white text-brand' : 'border-slate-200 bg-white text-slate-700'
                                }`}
                                value={currentBottleQty > 0 ? currentBottleQty : ''}
                                onChange={(e) => setItemQtyDirect(bottleKey, e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => updateItemQty(bottleKey, 1)}
                                className="w-6 h-6 rounded bg-slate-700 hover:opacity-90 text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            <div className="hidden sm:flex items-center gap-1">
                              {[1, 2, 5].map(q => (
                                <button
                                  type="button"
                                  key={q}
                                  onClick={() => updateItemQty(bottleKey, q)}
                                  className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 transition"
                                >
                                  +{q}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Stock Warning */}
                        {warning && (
                          <div className="mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 p-1.5 rounded flex items-center gap-1.5">
                            <AlertCircle size={13} className="shrink-0 text-amber-600" />
                            <span>{warning}</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Single unit control (19L Refill, etc.)
                  const unitKey = `${item.id}_UNIT`;
                  const currentQty = Number(cartMap[unitKey] || 0);
                  const currentPrice = getItemPrice(item, 'UNIT');
                  const isInCart = currentQty > 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        isInCart 
                          ? 'bg-brand/5 border-brand ring-1 ring-brand/20' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Title & Stock */}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <Package size={14} className="text-brand shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Stock: <strong className={totalStock <= 0 ? 'text-rose-600' : 'text-slate-700'}>
                              {totalStock} {item.unit || 'bottles'}
                            </strong>
                          </div>
                        </div>

                        {/* Price Input */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] font-mono text-slate-400">Rs</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded bg-slate-50 text-slate-800 text-center focus:bg-white focus:border-brand"
                            value={currentPrice}
                            onChange={(e) => handlePriceChange(unitKey, e.target.value)}
                            title="Rate"
                          />
                        </div>

                        {/* Stepper & Quick Add */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => updateItemQty(unitKey, -1)}
                              disabled={currentQty <= 0}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold text-xs"
                            >
                              <Minus size={11} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              className={`w-11 text-center font-mono font-bold text-xs border rounded p-0.5 ${
                                currentQty > 0 ? 'border-brand bg-white text-brand' : 'border-slate-200 bg-white text-slate-700'
                              }`}
                              value={currentQty > 0 ? currentQty : ''}
                              onChange={(e) => setItemQtyDirect(unitKey, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQty(unitKey, 1)}
                              className="w-6 h-6 rounded bg-brand hover:opacity-90 text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <div className="hidden sm:flex items-center gap-1">
                            {[1, 5, 10].map(q => (
                              <button
                                type="button"
                                key={q}
                                onClick={() => updateItemQty(unitKey, q)}
                                className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 transition"
                              >
                                +{q}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {warning && (
                        <div className="mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 p-1.5 rounded flex items-center gap-1.5">
                          <AlertCircle size={13} className="shrink-0 text-amber-600" />
                          <span>{warning}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Water Dispenser & Refill */}
          <div className="p-3 bg-gradient-to-r from-blue-50/70 to-sky-50/60 border border-blue-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Droplets size={14} />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  {waterMode === '19L' ? '19L Bottle Refill' : 'Custom Water Litres'}
                </span>
              </div>

              {/* Mode switch */}
              <div className="flex items-center bg-white p-0.5 rounded border border-slate-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setWaterMode('19L')}
                  className={`px-2 py-0.5 rounded ${waterMode === '19L' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  19L Refill
                </button>
                <button
                  type="button"
                  onClick={() => setWaterMode('CUSTOM')}
                  className={`px-2 py-0.5 rounded ${waterMode === 'CUSTOM' ? 'bg-teal-600 text-white' : 'text-slate-600'}`}
                >
                  Custom Litres
                </button>
              </div>
            </div>

            {waterMode === '19L' ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* Rate */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-semibold text-slate-600">Rate:</span>
                  <span className="text-[11px] font-mono text-slate-400">Rs</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded bg-white text-slate-800 text-center focus:border-blue-500"
                    value={refillPrice}
                    onChange={(e) => setRefillPrice(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400">/19L</span>
                </div>

                {/* Stepper & Quick */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setRefillQty(prev => Math.max(0, prev - 1))}
                      disabled={refillQty <= 0}
                      className="w-6 h-6 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      <Minus size={11} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      className={`w-11 text-center font-mono font-bold text-xs border rounded p-0.5 ${
                        refillQty > 0 ? 'border-blue-600 bg-white text-blue-700 font-extrabold' : 'border-slate-200 bg-white text-slate-800'
                      }`}
                      value={refillQty > 0 ? refillQty : ''}
                      onChange={(e) => setRefillQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    />
                    <button
                      type="button"
                      onClick={() => setRefillQty(prev => prev + 1)}
                      className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 5].map(q => (
                      <button
                        type="button"
                        key={q}
                        onClick={() => setRefillQty(prev => prev + q)}
                        className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border bg-white hover:bg-blue-50 text-blue-700 border-blue-200 transition"
                      >
                        +{q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* Custom Litres Rate */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-semibold text-slate-600">Rate:</span>
                  <span className="text-[11px] font-mono text-slate-400">Rs</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-14 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded bg-white text-slate-800 text-center focus:border-teal-500"
                    value={customWaterRate}
                    onChange={(e) => setCustomWaterRate(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400">/L</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setCustomWaterLitres(prev => Math.max(0, Math.round((prev - 1) * 10) / 10))}
                      disabled={customWaterLitres <= 0}
                      className="w-6 h-6 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      <Minus size={11} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      className={`w-14 text-center font-mono font-bold text-xs border rounded p-0.5 ${
                        customWaterLitres > 0 ? 'border-teal-600 bg-white text-teal-800 font-extrabold' : 'border-slate-200 bg-white text-slate-800'
                      }`}
                      value={customWaterLitres > 0 ? customWaterLitres : ''}
                      onChange={(e) => setCustomWaterLitres(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                    <button
                      type="button"
                      onClick={() => setCustomWaterLitres(prev => Math.round((prev + 1) * 10) / 10)}
                      className="w-6 h-6 rounded bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {[5, 10, 20].map(l => (
                      <button
                        type="button"
                        key={l}
                        onClick={() => setCustomWaterLitres(prev => Math.round((prev + l) * 10) / 10)}
                        className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border bg-white hover:bg-teal-50 text-teal-700 border-teal-200 transition"
                      >
                        +{l}L
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Bottling Supplies / Raw Materials (Caps) & Extra Fee */}
          {(counterRawMaterials.length > 0 || onManageSupplies) && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Supplies & Extras
                </span>
                <div className="flex items-center gap-1.5">
                  {onManageSupplies && (
                    <button
                      type="button"
                      onClick={onManageSupplies}
                      className="px-2 py-0.5 text-[11px] font-semibold rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1 transition shadow-2xs cursor-pointer"
                    >
                      <Plus size={11} /> Manage Supplies
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => addExtraItem('DELIVERY', 'Delivery Fee', 100)}
                    className="px-2 py-0.5 text-[11px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1"
                  >
                    <Plus size={11} /> Delivery (Rs 100)
                  </button>
                </div>
              </div>

              {counterRawMaterials.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {counterRawMaterials.map(rm => {
                    const rawKey = `${rm.id}_RAW`;
                    const currentQty = Number(cartMap[rawKey] || 0);
                    const defaultPrice = Number(rm.retailPrice || 0);
                    const currentPrice = customPrices[rawKey] !== undefined && customPrices[rawKey] !== '' ? customPrices[rawKey] : defaultPrice;
                    const stock = Number(rm.cachedQty || 0);

                    return (
                      <div key={rm.id} className="p-2 rounded bg-white border border-slate-200 flex items-center justify-between gap-1 text-xs">
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-800 truncate block text-[11px]">{rm.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Stock: {stock}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-400">Rs</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="w-12 px-1 py-0.5 text-[11px] font-mono font-bold border border-slate-200 rounded bg-slate-50 text-center"
                            value={currentPrice}
                            onChange={(e) => handlePriceChange(rawKey, e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => updateItemQty(rawKey, -1)}
                            disabled={currentQty <= 0}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center font-bold text-xs"
                          >
                            <Minus size={10} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            className={`w-9 text-center font-mono font-bold text-xs border rounded p-0.5 ${
                              currentQty > 0 ? 'border-emerald-600 bg-white text-emerald-700' : 'border-slate-200 bg-white text-slate-700'
                            }`}
                            value={currentQty > 0 ? currentQty : ''}
                            onChange={(e) => setItemQtyDirect(rawKey, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => updateItemQty(rawKey, 1)}
                            className="w-5 h-5 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-2.5 px-3 text-center rounded border border-dashed border-slate-200 bg-white">
                  <p className="text-[11px] text-slate-500 mb-1.5">No bottling supplies enabled for counter sale.</p>
                  {onManageSupplies && (
                    <button
                      type="button"
                      onClick={onManageSupplies}
                      className="btn-primary text-[11px] py-1 px-2.5 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={11} /> Select or Add Supplies
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Live Bill Summary & Fast Checkout */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
          
          {/* Bill Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-brand" /> Bill Items ({cartItems.length})
            </span>
            <span className="text-lg font-mono font-bold text-brand">
              Rs. {cartTotal.toLocaleString()}
            </span>
          </div>

          {/* Cart Items List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
            {cartItems.length === 0 ? (
              <div className="text-center py-6 text-slate-400 font-medium text-xs">
                Cart is empty. Select items on the left.
              </div>
            ) : (
              cartItems.map(item => (
                <div key={item.cartKey} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="font-semibold text-slate-800 block truncate text-xs">{item.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-mono text-slate-500">{item.quantity} × Rs</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="w-14 px-1 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded bg-slate-50 focus:bg-white focus:border-brand text-center"
                        value={item.unitPrice}
                        onChange={(e) => handlePriceChange(item.cartKey, e.target.value)}
                        title="Adjust rate inline"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      Rs. {item.lineTotal.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateItemQty(item.cartKey, -item.quantity)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tender & Payment Section */}
          <div className="space-y-2.5 border-t border-slate-200 pt-2.5 text-xs">
            
            {/* Amount Paid (Received) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 text-[11px]">Amount Received (Rs)</label>
                <button
                  type="button"
                  onClick={() => {
                    setAmountPaid(String(cartTotal));
                    setIsAmountPaidManual(false);
                  }}
                  className="text-[10px] text-brand hover:underline font-semibold"
                >
                  Exact (Rs. {cartTotal})
                </button>
              </div>
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

            {/* Unpaid Status Indicator */}
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

            {/* Customer Account Selector */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1 text-[11px] flex items-center gap-1">
                <User size={13} className={unpaidBalance > 0 ? 'text-amber-600' : 'text-slate-500'} />
                Customer {unpaidBalance > 0 ? <span className="text-amber-600 font-bold">* Required for debt</span> : '(Optional)'}
              </label>

              {/* CLEAN DROPDOWN: Shows only customer name in options */}
              <select
                className="select-base text-xs font-medium"
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
              >
                <option value="">-- Walk-In Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Show customer details ONLY WHEN SELECTED */}
              {selectedCustomer && (
                <div className="mt-1.5 p-2 bg-slate-100/90 border border-slate-200 rounded-lg text-xs space-y-0.5 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="truncate">{selectedCustomer.name}</span>
                    <span className="font-mono text-slate-500 flex items-center gap-1 text-[11px]">
                      <Phone size={10} /> {selectedCustomer.phone || 'No Phone'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-0.5">
                    <span>Outstanding Debt:</span>
                    <strong className="text-rose-600">Rs. {Number(selectedCustomer.currentBalance || 0).toLocaleString()}</strong>
                  </div>
                  {unpaidBalance > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-sky-700 font-semibold pt-0.5 border-t border-slate-200">
                      <span>New Debt After Sale:</span>
                      <span>Rs. {projectedBalance.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Walk-in debt error */}
              {isWalkInDebtBlocked && (
                <div className="mt-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] font-medium flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>Walk-in requires full payment. Select a customer to record debt.</span>
                </div>
              )}
            </div>

            {/* Payment Method & Remarks */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-600 mb-0.5 text-[10px] uppercase">Method</label>
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
                <label className="block font-medium text-slate-600 mb-0.5 text-[10px] uppercase">Note</label>
                <input 
                  type="text" 
                  className="input-base text-xs py-1.5" 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)} 
                  placeholder="Optional..."
                />
              </div>
            </div>

            {/* Flexible Stock Override Confirmation Banner */}
            {hasStockDeficit && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <span>Recorded Stock Exceeded</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Physical stock present on counter? Check below to proceed without blocking (production batch can be logged later).
                </p>
                <label className="flex items-center gap-2 pt-1 font-semibold text-xs cursor-pointer select-none text-amber-900">
                  <input
                    type="checkbox"
                    checked={allowStockOverride}
                    onChange={(e) => setAllowStockOverride(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-400 text-brand focus:ring-brand cursor-pointer"
                  />
                  <span>Allow Sale (Physical stock verified on counter)</span>
                </label>
              </div>
            )}

            {/* Fast Submit Button */}
            <button 
              type="submit" 
              disabled={submitting || cartItems.length === 0 || isWalkInDebtBlocked || (hasStockDeficit && !allowStockOverride)}
              className={`w-full py-2.5 text-xs uppercase tracking-wider font-bold mt-1 flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                hasStockDeficit && allowStockOverride 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'btn-primary'
              }`}
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Zap size={14} className="fill-white" />
              )}
              {hasStockDeficit && allowStockOverride ? 'Record Sale (Stock Override)' : 'Record Sale'} — Rs. {cartTotal.toLocaleString()}
            </button>
          </div>

        </div>

      </form>
    </div>
  );
}

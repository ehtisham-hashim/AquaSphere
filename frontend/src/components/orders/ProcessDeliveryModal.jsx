import { useState, useEffect } from 'react';
import { X, Truck, CheckCircle, Package, DollarSign, AlertTriangle, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { useAuth } from '../../context/AuthContext';

export default function ProcessDeliveryModal({ order, onClose, onDeliveryProcessed }) {
  const { user } = useAuth();
  const isMarketingManager = user?.role === 'MARKETING_MANAGER';
  const company = getCompanyFromCookie();
  const isAquaSphere = company === 'aquasphere';

  const [stockMap, setStockMap] = useState({});
  const [loadingStock, setLoadingStock] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await fetch(`${API_URL}/items?type=FINISHED_GOOD`, {
          headers: { 'x-tenant': company },
          credentials: 'include'
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const map = {};
          json.data.forEach(i => {
            map[i.id] = Number(i.factoryQty !== undefined && i.factoryQty !== null ? i.factoryQty : i.cachedQty || 0);
          });
          setStockMap(map);
        }
      } catch (err) {
        console.error('Failed to fetch stock info for delivery modal:', err);
      } finally {
        setLoadingStock(false);
      }
    };
    fetchStock();
  }, [company]);

  const calculateDefaultQtyDelivered = () => {
    if (!order.items || order.items.length === 0) return 0;
    if (order.type === 'NINETEEN_L') {
      const qty19L = order.items.filter(i => i.item?.name?.toLowerCase().includes('19l')).reduce((sum, i) => sum + i.quantity, 0);
      return qty19L > 0 ? qty19L : order.items[0].quantity;
    }
    return order.items.reduce((sum, i) => sum + i.quantity, 0);
  };

  const qty19LOrdered = order.items?.filter(i => i.item?.name?.toLowerCase().includes('19l')).reduce((sum, i) => sum + i.quantity, 0) || 0;
  const previouslyReturned = order.deliveries?.reduce((sum, d) => sum + (parseInt(d.bottlesReturnedGood || 0) + parseInt(d.bottlesReturnedBroken || 0)), 0) || 0;

  const is19LOrder = isAquaSphere && (order.type === 'NINETEEN_L' || qty19LOrdered > 0);
  const remainingBottlesToReturn = is19LOrder ? Math.max(0, qty19LOrdered - previouslyReturned) : Infinity;
  const maxReturnedAllowed = is19LOrder ? remainingBottlesToReturn : Infinity;
  const isBottleReturnLocked = is19LOrder && remainingBottlesToReturn <= 0;

  const orderTotal = (order.items || []).reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const totalItems = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
  const alreadyPaid = order.payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || (order.paymentStatus === 'PAID' ? orderTotal : 0);
  const remainingOrderBalance = Math.max(0, orderTotal - alreadyPaid);
  const currentDebt = Math.max(0, parseFloat(order.customer?.currentBalance || 0));
  const maxPayable = remainingOrderBalance + currentDebt;

  const isPaymentSettlementOnly = order.deliveryStatus === 'DELIVERED' && order.paymentStatus !== 'PAID';

  const [deliveryData, setDeliveryData] = useState({
    qtyDelivered: calculateDefaultQtyDelivered(),
    bottlesReturnedGood: 0,
    bottlesReturnedBroken: 0,
    cashReceived: isMarketingManager ? 0 : (order.paymentStatus === 'PAID' ? 0 : remainingOrderBalance),
    paymentMethod: 'CASH',
    remarks: ''
  });

  const [softBlockMsg, setSoftBlockMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stockErrors = [];
  if (!isPaymentSettlementOnly && !loadingStock) {
    order.items?.forEach(i => {
      const avail = stockMap[i.itemId] !== undefined ? stockMap[i.itemId] : Number(i.item?.factoryQty !== undefined ? i.item.factoryQty : i.item?.cachedQty || 0);
      const req = Number(i.quantity || 0);
      if (avail < req) {
        stockErrors.push({
          name: i.item?.name || 'Finished Product',
          required: req,
          available: avail
        });
      }
    });
  }
  const hasInsufficientStock = stockErrors.length > 0;

  const handleChange = (e) => setDeliveryData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleBottleChange = (e) => {
    const { name, value } = e.target;
    const val = Math.max(0, parseInt(value || 0));

    if (is19LOrder) {
      const otherVal = name === 'bottlesReturnedGood'
        ? parseInt(deliveryData.bottlesReturnedBroken || 0)
        : parseInt(deliveryData.bottlesReturnedGood || 0);

      if (val + otherVal > maxReturnedAllowed) {
        toast.error(`Total 19L bottles returned cannot exceed max limit of ${maxReturnedAllowed}`);
        return;
      }
    }

    setDeliveryData(prev => ({ ...prev, [name]: val }));
  };

  const submitDelivery = async (e, bypassBottleCheck = false) => {
    if (e) e.preventDefault();

    if (hasInsufficientStock) {
      toast.error('Cannot deliver order: Insufficient finished goods stock in inventory.');
      return;
    }

    const cashVal = parseFloat(deliveryData.cashReceived || 0);
    if (cashVal > maxPayable) {
      toast.error(`Cash received (Rs. ${cashVal}) cannot exceed total customer payable balance (Rs. ${maxPayable})`);
      return;
    }

    if (is19LOrder) {
      const totalReturned = parseInt(deliveryData.bottlesReturnedGood || 0) + parseInt(deliveryData.bottlesReturnedBroken || 0);
      if (totalReturned > maxReturnedAllowed) {
        toast.error(`Total 19L bottles returned (${totalReturned}) exceeds remaining limit (${maxReturnedAllowed})`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/orders/${order.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deliveryData, bypassBottleCheck }),
        credentials: 'include'
      });

      const json = await res.json();

      if (!res.ok && json.message && json.message.includes('SOFT_BLOCK_BOTTLES')) {
        setSoftBlockMsg(json.message.replace('SOFT_BLOCK_BOTTLES: ', ''));
        setIsSubmitting(false);
        return;
      }

      if (json.success) {
        toast.success('Delivery processed successfully!');
        onDeliveryProcessed();
      } else {
        toast.error(json.message || 'Failed to process delivery');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error processing delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl relative">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isPaymentSettlementOnly ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'}`}>
              {isPaymentSettlementOnly ? <DollarSign size={24} /> : <Truck size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {isPaymentSettlementOnly ? 'Settle Payment & Greenlit Order' : 'Process Delivery'}
              </h3>
              <div className="text-sm text-slate-500">Order: ORD-{order.id.substring(0,6).toUpperCase()} • {order.customer?.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={(e) => submitDelivery(e, false)} className="p-6 space-y-8">
          
          {hasInsufficientStock && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex items-start gap-3 text-rose-900 shadow-sm">
              <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-bold text-sm text-rose-950">Delivery Blocked: Insufficient Factory Floor Stock</h4>
                <p className="mt-0.5 text-rose-800 font-medium">
                  You cannot deliver this order because finished stock on the Factory Floor is lower than required. Stock stored in Warehouse cannot be automatically delivered — the Production Manager must run a Production batch or Transfer Stock from Warehouse to Factory Floor first.
                </p>
                <ul className="mt-1.5 list-disc pl-4 space-y-0.5 font-bold">
                  {stockErrors.map((err, idx) => (
                    <li key={idx}>
                      {err.name}: Required {err.required} units, but only {err.available} available on Factory Floor.
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="flex flex-col">
                 <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Ordered Qty</span>
                 <span className="text-lg font-bold text-slate-800">{totalItems} Units</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Value</span>
                 <span className="text-lg font-bold text-slate-800">Rs. {orderTotal}</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Payment Status</span>
                 <span className={`text-sm font-bold mt-1 px-2 py-0.5 rounded-full w-max ${order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                   {order.paymentStatus}
                 </span>
               </div>
               <div className="flex flex-col">
                 <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Security Deposit</span>
                 <span className="text-sm font-bold text-emerald-700 mt-1">Rs. {parseFloat(order.customer?.deposit || 0).toLocaleString()}</span>
               </div>
             </div>

             {/* Item Types Breakdown with Factory Floor Stock Status */}
             <div className="border-t border-slate-200 pt-3">
               <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Order Items & Factory Floor Stock</span>
               <div className="flex flex-wrap gap-2">
                 {order.items?.map(i => {
                   const avail = stockMap[i.itemId] !== undefined ? stockMap[i.itemId] : Number(i.item?.factoryQty !== undefined ? i.item.factoryQty : i.item?.cachedQty || 0);
                   const isShort = !isPaymentSettlementOnly && avail < i.quantity;

                   return (
                     <div key={i.id} className={`text-xs border px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 ${isShort ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                       <span>{i.quantity}x {i.item?.name || 'Product'}</span>
                       <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${isShort ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                         Factory Stock: {avail} / Req: {i.quantity} {isShort ? '❌ Short' : '✓ OK'}
                       </span>
                     </div>
                   );
                 })}
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            
            <div className="space-y-4">
               <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Package size={16}/> Delivery & Bottles</h4>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Delivered (Fixed from Order)</label>
                 <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold text-sm flex justify-between items-center cursor-not-allowed">
                   <span>{totalItems} Units</span>
                   <span className="text-xs font-semibold text-slate-500">(Non-editable)</span>
                 </div>
               </div>
               
               {is19LOrder ? (
                 <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                   <div className="flex justify-between items-center">
                     <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                       19L bottles returned
                     </span>
                     <span className="text-xs font-semibold text-slate-500">
                       Max Allowed: {maxReturnedAllowed} {previouslyReturned > 0 ? `(Prev: ${previouslyReturned}/${qty19LOrdered})` : ''}
                     </span>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="block text-xs font-medium text-slate-600 mb-1">Good Condition</label>
                       <input 
                         name="bottlesReturnedGood" 
                         type="number" 
                         min="0" 
                         max={maxReturnedAllowed}
                         disabled={isBottleReturnLocked} 
                         className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed font-medium" 
                         value={deliveryData.bottlesReturnedGood} 
                         onChange={handleBottleChange} 
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-600 mb-1">Broken Condition</label>
                       <input 
                         name="bottlesReturnedBroken" 
                         type="number" 
                         min="0" 
                         max={maxReturnedAllowed}
                         disabled={isBottleReturnLocked} 
                         className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed font-medium" 
                         value={deliveryData.bottlesReturnedBroken} 
                         onChange={handleBottleChange} 
                       />
                     </div>
                   </div>

                   {isBottleReturnLocked && (
                     <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg text-center flex items-center justify-center gap-1.5">
                       <Lock size={14} /> All {qty19LOrdered} ordered 19L bottle(s) were returned previously for this order. Input is locked.
                     </p>
                   )}
                 </div>
               ) : (
                 !isAquaSphere && order.type === 'NINETEEN_L' && (
                   <>
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Empty Bottles Returned (Good)</label>
                       <input name="bottlesReturnedGood" type="number" min="0" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={deliveryData.bottlesReturnedGood} onChange={handleChange} />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Empty Bottles Returned (Broken)</label>
                       <input name="bottlesReturnedBroken" type="number" min="0" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={deliveryData.bottlesReturnedBroken} onChange={handleChange} />
                     </div>
                   </>
                 )
               )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2"><DollarSign size={16}/> Settlement</h4>
              
              {isMarketingManager ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
                  <span className="font-bold text-amber-900 block text-sm">Payment Confirmation Handled by Accounts</span>
                  <p className="text-amber-800 leading-relaxed">
                    Marketing Manager registers delivery fulfillment and bottle returns. Stock will be dispatched. Payment collection and settlement will be confirmed and updated by the Accountant.
                  </p>
                  <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center text-amber-950 font-bold">
                    <span>Order Amount Pending Settlement:</span>
                    <span className="text-sm font-black font-mono">Rs. {remainingOrderBalance.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-slate-700">Cash Received (Rs) *</label>
                      <span className="text-[11px] font-bold text-slate-500">Max Allowed: Rs. {maxPayable}</span>
                    </div>
                    <input name="cashReceived" type="number" step="0.01" min="0" max={maxPayable} className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none font-bold text-slate-800" value={deliveryData.cashReceived} onChange={handleChange} required />
                    {parseFloat(order.customer?.deposit || 0) > 0 && (
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1 inline-block font-semibold">
                        Deposit Available: Rs. {parseFloat(order.customer?.deposit || 0)} (Unpaid order balance will auto-deduct from deposit first)
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                    <select name="paymentMethod" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none" value={deliveryData.paymentMethod} onChange={handleChange}>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer / Online</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Remarks</label>
                <textarea name="remarks" rows="2" className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 outline-none resize-none" value={deliveryData.remarks} onChange={handleChange} placeholder="Share route notes or WhatsApp handoff"></textarea>
              </div>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting || hasInsufficientStock}
              className={`px-8 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${
                hasInsufficientStock
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50'
              }`}
            >
              <CheckCircle size={18}/> {isSubmitting ? 'Processing...' : (hasInsufficientStock ? '❌ Insufficient Stock in Inventory' : 'Mark as Delivered')}
            </button>
          </div>
        </form>

        {/* Soft-Block Warning Modal Overlay */}
        {softBlockMsg && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-20 rounded-2xl">
            <div className="bg-white border border-amber-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={28} />
              </div>
              <h4 className="text-lg font-bold text-slate-800">Bottle Return Warning</h4>
              <p className="text-xs text-slate-600 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                {softBlockMsg}
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSoftBlockMsg(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Adjust Bottle Counts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSoftBlockMsg(null);
                    submitDelivery(null, true);
                  }}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
                >
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

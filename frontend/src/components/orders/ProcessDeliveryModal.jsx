import { useState, useEffect } from 'react';
import { X, Truck, CheckCircle, Package, DollarSign, AlertTriangle, AlertCircle } from 'lucide-react';
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
  const isPaidInAdvance = order.paymentStatus === 'PAID' || remainingOrderBalance === 0;
  const currentDebt = Math.max(0, parseFloat(order.customer?.currentBalance || 0));
  const maxPayable = remainingOrderBalance + currentDebt;

  const isPaymentSettlementOnly = order.deliveryStatus === 'DELIVERED' && order.paymentStatus !== 'PAID';

  const [deliveryData, setDeliveryData] = useState({
    qtyDelivered: calculateDefaultQtyDelivered(),
    bottlesReturnedGood: 0,
    bottlesReturnedBroken: 0,
    cashReceived: isMarketingManager || isPaidInAdvance ? 0 : remainingOrderBalance,
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
          name: i.item?.name || 'Product',
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
        toast.error(`Total 19L bottles returned cannot exceed ${maxReturnedAllowed}`);
        return;
      }
    }

    setDeliveryData(prev => ({ ...prev, [name]: val }));
  };

  const submitDelivery = async (e, bypassBottleCheck = false) => {
    if (e) e.preventDefault();

    if (hasInsufficientStock) {
      toast.error('Cannot deliver order: Insufficient stock on Factory Floor.');
      return;
    }

    const cashVal = isPaidInAdvance ? 0 : parseFloat(deliveryData.cashReceived || 0);
    if (!isPaidInAdvance && cashVal > maxPayable) {
      toast.error(`Cash received (Rs. ${cashVal}) exceeds customer payable balance (Rs. ${maxPayable})`);
      return;
    }

    if (is19LOrder) {
      const totalReturned = parseInt(deliveryData.bottlesReturnedGood || 0) + parseInt(deliveryData.bottlesReturnedBroken || 0);
      if (totalReturned > maxReturnedAllowed) {
        toast.error(`Total bottles returned (${totalReturned}) exceeds limit (${maxReturnedAllowed})`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/orders/${order.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deliveryData, cashReceived: isPaidInAdvance ? 0 : deliveryData.cashReceived, bypassBottleCheck }),
        credentials: 'include'
      });

      const json = await res.json();

      if (!res.ok && json.message && json.message.includes('SOFT_BLOCK_BOTTLES')) {
        setSoftBlockMsg(json.message.replace('SOFT_BLOCK_BOTTLES: ', ''));
        setIsSubmitting(false);
        return;
      }

      if (json.success) {
        toast.success(isPaymentSettlementOnly ? 'Payment settled successfully!' : 'Order delivered successfully!');
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Clean Header */}
        <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isPaymentSettlementOnly ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'}`}>
              {isPaymentSettlementOnly ? <DollarSign size={20} /> : <Truck size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isPaymentSettlementOnly ? 'Settle Payment' : 'Process Delivery'}
              </h3>
              <div className="text-xs text-slate-500">Order #{order.id.substring(0, 6).toUpperCase()} • {order.customer?.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => submitDelivery(e, false)} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Crisp 1-Line Stock Alert */}
          {hasInsufficientStock && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-rose-900 text-xs font-semibold">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>
                Insufficient Factory Floor stock: {stockErrors.map(e => `${e.name} (Need: ${e.required}, Avail: ${e.available})`).join(', ')}
              </span>
            </div>
          )}

          {/* Compact Order Snapshot */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Ordered Qty</span>
                <span className="font-bold text-slate-800 text-sm">{totalItems} Units • Rs. {orderTotal.toLocaleString()}</span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Status</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
            {parseFloat(order.customer?.deposit || 0) > 0 && (
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Security Deposit</span>
                <span className="font-bold text-emerald-700">Rs. {parseFloat(order.customer?.deposit || 0).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Delivery & Bottle Returns */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14}/> Dispatch & Returns
              </h4>

              {is19LOrder ? (
                <div className="space-y-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">19L Bottles Returned</span>
                    <span className="text-slate-500 font-medium text-[11px]">Max: {maxReturnedAllowed}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Good Condition</label>
                      <input 
                        name="bottlesReturnedGood" 
                        type="number" 
                        min="0" 
                        max={maxReturnedAllowed}
                        disabled={isBottleReturnLocked} 
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none disabled:bg-slate-100 font-medium" 
                        value={deliveryData.bottlesReturnedGood} 
                        onChange={handleBottleChange} 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Broken Condition</label>
                      <input 
                        name="bottlesReturnedBroken" 
                        type="number" 
                        min="0" 
                        max={maxReturnedAllowed}
                        disabled={isBottleReturnLocked} 
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none disabled:bg-slate-100 font-medium" 
                        value={deliveryData.bottlesReturnedBroken} 
                        onChange={handleBottleChange} 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 font-medium">
                  Dispatching {totalItems} units from Factory Floor stock.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Remarks</label>
                <input 
                  name="remarks" 
                  type="text" 
                  className="input-base text-xs" 
                  value={deliveryData.remarks} 
                  onChange={handleChange} 
                  placeholder="Optional driver or route notes..." 
                />
              </div>
            </div>

            {/* Clean Settlement Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={14}/> Settlement
              </h4>

              {isPaidInAdvance ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-emerald-900 text-xs font-bold">
                  <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                  <div>
                    <div>Paid in Advance</div>
                    <div className="text-[11px] font-medium text-emerald-700">Rs. 0 Due • No additional cash collection required.</div>
                  </div>
                </div>
              ) : isMarketingManager ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                  <span className="font-bold">Pending Settlement: Rs. {remainingOrderBalance.toLocaleString()}</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">Payment collection will be confirmed by Accounts.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">Cash Received (Rs.)</label>
                      <span className="text-[11px] text-slate-500 font-medium">Due: Rs. {remainingOrderBalance.toLocaleString()}</span>
                    </div>
                    <input 
                      name="cashReceived" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      max={maxPayable} 
                      className="input-base font-mono font-bold text-slate-800 text-sm" 
                      value={deliveryData.cashReceived} 
                      onChange={handleChange} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                    <select name="paymentMethod" className="select-base text-xs" value={deliveryData.paymentMethod} onChange={handleChange}>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer / Online</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting || hasInsufficientStock}
              className={`text-xs py-2 px-5 flex items-center gap-1.5 font-bold rounded-xl transition-all shadow-xs ${
                hasInsufficientStock
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                  : 'btn-primary'
              }`}
            >
              <CheckCircle size={14}/> {isSubmitting ? 'Processing...' : (hasInsufficientStock ? 'Insufficient Stock' : (isPaymentSettlementOnly ? 'Confirm Settlement' : 'Mark as Delivered'))}
            </button>
          </div>
        </form>

        {/* Soft-Block Warning Modal Overlay */}
        {softBlockMsg && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-20 rounded-2xl">
            <div className="bg-white border border-amber-200 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3 text-center">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={22} />
              </div>
              <h4 className="text-base font-bold text-slate-800">Bottle Return Warning</h4>
              <p className="text-xs text-slate-600 bg-amber-50 border border-amber-100 p-2.5 rounded-xl">
                {softBlockMsg}
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSoftBlockMsg(null)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Adjust Counts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSoftBlockMsg(null);
                    submitDelivery(null, true);
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl"
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

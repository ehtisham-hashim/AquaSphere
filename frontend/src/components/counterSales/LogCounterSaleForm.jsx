import { DollarSign, CheckCircle2, User, Loader2, AlertTriangle, ShoppingBag, Zap, Printer } from 'lucide-react';
import { COUNTER_PRODUCTS, PAYMENT_METHODS } from '../../constants/counterSale';

export default function LogCounterSaleForm({
  liveSaleNumber,
  user,
  liveDateTime,
  selectedProductId,
  productQuantity,
  handleProductOrQtyChange,
  available19LBottles,
  available05LPacks,
  loose05L,
  totalBottles05L,
  available15LPacks,
  loose15L,
  totalBottles15L,
  stockValidation,
  cashCollected,
  setCashCollected,
  creditAmount,
  setCreditAmount,
  isCreditSale,
  customerId,
  setCustomerId,
  customers,
  isCreditLimitExceeded,
  numericCredit,
  projectedBalance,
  customerLimit,
  paymentMethod,
  setPaymentMethod,
  remarks,
  setRemarks,
  handleFormSubmit,
  submitting,
  lastRecordedSale,
  onPrintReceipt
}) {
  const selectedProd = COUNTER_PRODUCTS.find(p => p.id === selectedProductId);
  const qtyNum = parseFloat(productQuantity) || 0;
  const unitPrice = selectedProd?.defaultPrice || 0;
  const calculatedTotal = selectedProductId === 'CUSTOM' ? (parseFloat(cashCollected || 0) + parseFloat(creditAmount || 0)) : (qtyNum * unitPrice);

  const setQtyPreset = (q) => {
    handleProductOrQtyChange(selectedProductId, String(q));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm w-full space-y-4">
      {/* Last Recorded Sale Notification Banner (No tab switch needed!) */}
      {lastRecordedSale && (
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>
              Sale <strong className="font-mono">{lastRecordedSale.saleNumber}</strong> recorded (Rs. {(Number(lastRecordedSale.cashCollected || 0) + Number(lastRecordedSale.creditAmount || 0)).toLocaleString()}) — Form ready for next customer!
            </span>
          </div>
          <button
            type="button"
            onClick={() => onPrintReceipt(lastRecordedSale)}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Printer size={13} /> Print Receipt
          </button>
        </div>
      )}

      {/* Streamlined Compact Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-medium">Sale ID: <strong className="font-mono text-emerald-800 text-sm">{liveSaleNumber}</strong></span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-medium">Operator: <strong className="text-slate-800">{user?.name || user?.role}</strong></span>
        </div>
        <div className="text-slate-500 font-medium">
          {liveDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Fast Product Selection Catalog Grid */}
      <div>
        <label className="block font-bold text-slate-800 mb-1.5 text-xs uppercase tracking-wider">Select Product *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {COUNTER_PRODUCTS.map(prod => {
            const isSelected = selectedProductId === prod.id;
            let stockDisplay = null;
            if (prod.id === 'PACK_05L') stockDisplay = `${Math.floor(available05LPacks)} pk`;
            else if (prod.id === 'SINGLE_05L') stockDisplay = `${totalBottles05L} btl`;
            else if (prod.id === 'PACK_15L') stockDisplay = `${Math.floor(available15LPacks)} pk`;
            else if (prod.id === 'SINGLE_15L') stockDisplay = `${totalBottles15L} btl`;
            else if (prod.id === 'BOTTLE_19L') stockDisplay = `${available19LBottles} btl`;

            return (
              <button
                type="button"
                key={prod.id}
                onClick={() => handleProductOrQtyChange(prod.id, productQuantity)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-bold' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="text-xs font-bold truncate">{prod.name}</div>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className={isSelected ? 'text-emerald-100 font-semibold' : 'text-slate-500'}>Rs. {prod.defaultPrice}</span>
                  {stockDisplay && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {stockDisplay}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
        {/* Quantity Selection + Quick Preset Buttons */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-semibold text-slate-700 text-xs uppercase tracking-wider">
              Quantity ({selectedProd?.unitLabel || 'Units'}) *
            </label>
            {/* Quick Quantity Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick:</span>
              {[1, 2, 5, 10, 20].map(q => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setQtyPreset(q)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition ${
                    qtyNum === q 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <input 
            type="number" 
            step="1"
            min="1"
            className={`w-full border rounded-xl p-2.5 font-black text-lg text-slate-800 outline-none transition-all shadow-xs focus:ring-2 ${
              !stockValidation.valid
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10 bg-red-50/30'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10'
            }`}
            value={productQuantity} 
            onChange={(e) => handleProductOrQtyChange(selectedProductId, e.target.value)} 
            required 
          />
          {!stockValidation.valid && (
            <div className="mt-1.5 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <ShoppingBag size={14} className="shrink-0 text-red-500" />
              <span className="text-xs font-bold">{stockValidation.message}</span>
            </div>
          )}
        </div>

        {/* Live Calculated Total Display */}
        {selectedProductId !== 'CUSTOM' && (
          <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="text-xs text-slate-600 font-medium">
              Calculated Total: <span className="font-bold text-slate-900">{qtyNum} x Rs. {unitPrice}</span>
            </div>
            <div className="text-xl font-black text-emerald-800">
              Rs. {calculatedTotal.toLocaleString()}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Cash Collected (Rs)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={16}/>
              <input 
                type="number" 
                step="1" 
                min="0"
                className="w-full border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 font-black text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-xs" 
                value={cashCollected} 
                onChange={(e) => setCashCollected(e.target.value)} 
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Credit Amount (Rs)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600" size={16}/>
              <input 
                type="number" 
                step="1" 
                min="0"
                className={`w-full border rounded-xl py-2.5 pl-9 pr-3 font-black text-purple-900 outline-none focus:ring-2 transition-all shadow-xs ${
                  isCreditSale && !customerId
                    ? 'border-orange-400 focus:border-orange-500 focus:ring-orange-500/10 bg-orange-50/30'
                    : 'border-slate-200 focus:border-purple-500 focus:ring-purple-500/10'
                }`}
                value={creditAmount} 
                onChange={(e) => setCreditAmount(e.target.value)} 
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Customer Selection — Required only for Credit */}
        <div className={`p-3 rounded-xl border transition-all ${isCreditSale ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
          <label className="block font-bold text-slate-800 mb-1 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User size={14} className={isCreditSale ? 'text-purple-700' : 'text-slate-500'} />
              Customer Profile {isCreditSale ? <span className="text-purple-700 font-extrabold">* MANDATORY FOR CREDIT</span> : '(Optional for Cash)'}
            </span>
          </label>

          <select
            className={`w-full border rounded-xl p-2.5 bg-white text-xs font-semibold outline-none transition-all shadow-xs ${
              isCreditSale ? 'border-purple-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/10 text-purple-950' : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-slate-800'
            }`}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required={isCreditSale}
          >
            <option value="">-- {isCreditSale ? 'Select Mandatory Customer for Credit' : 'Walk-In Cash Customer'} --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone}) — Bal: Rs {Number(c.currentBalance || 0).toLocaleString()}
              </option>
            ))}
          </select>

          {isCreditLimitExceeded && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2 text-amber-900 text-xs font-semibold">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5"/>
              <div>
                <strong className="block font-bold">Credit Limit Warning!</strong>
                Customer balance will reach <span className="font-extrabold text-red-700">Rs. {projectedBalance.toLocaleString()}</span> (Limit: Rs. {customerLimit.toLocaleString()}).
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Payment Method</label>
            <select
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-xs font-semibold outline-none focus:border-emerald-500 shadow-xs"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wider">Remarks / Notes</label>
            <input 
              type="text" 
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-emerald-500 shadow-xs" 
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)} 
              placeholder="Optional notes..."
            />
          </div>
        </div>

        {/* 1-Click Fast Submit Button */}
        <div className="pt-2 flex justify-end">
          <button 
            type="submit" 
            disabled={submitting || (isCreditSale && !customerId) || !stockValidation.valid}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="fill-white" />}
            Record Counter Sale (Enter)
          </button>
        </div>
      </form>
    </div>
  );
}

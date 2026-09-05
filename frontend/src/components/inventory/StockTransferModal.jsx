import { useState } from 'react';
import { ArrowLeftRight, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL as API } from '../../utils/api';

export default function StockTransferModal({ isOpen, onClose, items = [], tenant = 'aquasphere', onSuccess }) {
  const [itemId, setItemId] = useState('');
  const [fromLocation, setFromLocation] = useState('FACTORY');
  const [toLocation, setToLocation] = useState('WAREHOUSE');
  const [quantity, setQuantity] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [reason, setReason] = useState('Daily warehouse transfer');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedItem = items.find(i => i.id === itemId);
  const totalQty = Number(selectedItem?.cachedQty || 0);
  const facQty = Number(selectedItem?.factoryQty || 0);
  const whQty = Number(selectedItem?.warehouseQty || 0);

  const effectiveFactory = (facQty === 0 && whQty === 0) ? totalQty : facQty;
  const effectiveWarehouse = (facQty === 0 && whQty === 0) ? 0 : whQty;

  const availableAtSource = selectedItem 
    ? Number(fromLocation === 'FACTORY' ? effectiveFactory : effectiveWarehouse)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemId) return toast.error('Please select an item');
    if (!quantity || parseFloat(quantity) <= 0) return toast.error('Please enter a valid quantity');
    if (fromLocation === toLocation) return toast.error('From and To locations must be different');
    if (parseFloat(quantity) > availableAtSource) {
      return toast.error(`Cannot transfer ${quantity}. Only ${availableAtSource} available at ${fromLocation}.`);
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/items/transfer-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          itemId,
          fromLocation,
          toLocation,
          quantity: parseFloat(quantity),
          batchNo: batchNo.trim() || undefined,
          reason: reason || 'Daily warehouse transfer',
          notes: notes.trim() || undefined
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to transfer stock');

      toast.success(`Stock Transferred: ${fromLocation} ➔ ${toLocation}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error transferring stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="text-brand w-5 h-5" />
            <h3 className="text-base font-bold">Transfer Finished Goods Stock</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs text-slate-700">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">Select Product</label>
            <select
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              required
              className="select-base text-xs font-medium"
            >
              <option value="">-- Choose Item --</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">From Location</label>
              <select
                value={fromLocation}
                onChange={e => {
                  setFromLocation(e.target.value);
                  if (e.target.value === toLocation) setToLocation(e.target.value === 'FACTORY' ? 'WAREHOUSE' : 'FACTORY');
                }}
                className="select-base text-xs font-semibold"
              >
                <option value="FACTORY">🏭 Factory Floor</option>
                <option value="WAREHOUSE">🏢 Warehouse</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">To Location</label>
              <select
                value={toLocation}
                onChange={e => {
                  setToLocation(e.target.value);
                  if (e.target.value === fromLocation) setFromLocation(e.target.value === 'FACTORY' ? 'WAREHOUSE' : 'FACTORY');
                }}
                className="select-base text-xs font-semibold"
              >
                <option value="WAREHOUSE">🏢 Warehouse</option>
                <option value="FACTORY">🏭 Factory Floor</option>
              </select>
            </div>
          </div>

          {selectedItem && (
            <div className="bg-brand/10 border border-brand/20 rounded-xl p-2.5 flex justify-between items-center text-xs font-semibold text-brand">
              <span>Available Stock at {fromLocation}:</span>
              <span className="text-xs font-mono font-bold">
                {availableAtSource.toLocaleString()} {selectedItem.unit || (tenant === 'wadaana' ? 'bottles' : 'packs')}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">Quantity to Transfer</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                placeholder="e.g. 40"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="input-base text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">Batch Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. AQ-20260801-001"
                value={batchNo}
                onChange={e => setBatchNo(e.target.value)}
                className="input-base text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">Transfer Reason</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="select-base text-xs font-medium"
            >
              <option value="Daily warehouse transfer">Daily warehouse transfer</option>
              <option value="Factory replenishment">Factory replenishment</option>
              <option value="Stock balancing for dispatch">Stock balancing for dispatch</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">Transfer Notes / Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Moved to main warehouse for dispatch"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-base text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
              Confirm Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

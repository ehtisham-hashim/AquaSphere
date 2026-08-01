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
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedItem = items.find(i => i.id === itemId);
  const availableAtSource = selectedItem 
    ? Number((fromLocation === 'FACTORY' ? selectedItem.factoryQty : selectedItem.warehouseQty) || 0)
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
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold">Transfer Finished Goods Stock</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm text-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Product</label>
            <select
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-3 bg-white font-medium text-slate-800 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
            >
              <option value="">-- Choose Item --</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} (Factory: {Number(item.factoryQty || 0)} | Warehouse: {Number(item.warehouseQty || 0)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">From Location</label>
              <select
                value={fromLocation}
                onChange={e => {
                  setFromLocation(e.target.value);
                  if (e.target.value === toLocation) setToLocation(e.target.value === 'FACTORY' ? 'WAREHOUSE' : 'FACTORY');
                }}
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-bold text-slate-800 outline-none"
              >
                <option value="FACTORY">🏭 Factory Floor</option>
                <option value="WAREHOUSE">🏢 Warehouse</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">To Location</label>
              <select
                value={toLocation}
                onChange={e => {
                  setToLocation(e.target.value);
                  if (e.target.value === fromLocation) setFromLocation(e.target.value === 'FACTORY' ? 'WAREHOUSE' : 'FACTORY');
                }}
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-bold text-slate-800 outline-none"
              >
                <option value="WAREHOUSE">🏢 Warehouse</option>
                <option value="FACTORY">🏭 Factory Floor</option>
              </select>
            </div>
          </div>

          {selectedItem && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex justify-between items-center text-xs font-semibold text-sky-900">
              <span>Available Stock at {fromLocation}:</span>
              <span className="text-sm font-bold text-sky-950">{availableAtSource} {selectedItem.unit || 'units'}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quantity to Transfer</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                placeholder="e.g. 40"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-sky-500 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Batch Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. AQ-20260801-001"
                value={batchNo}
                onChange={e => setBatchNo(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-sky-500 font-mono text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Transfer Notes / Remarks</label>
            <input
              type="text"
              placeholder="e.g. Moved 40 packs to main warehouse for dispatch"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-sky-500 text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#0ea5e9] hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />}
              Confirm Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

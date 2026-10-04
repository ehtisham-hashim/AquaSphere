import { useState, useEffect, useCallback } from 'react';
import { X, Package, Check, Plus, Loader2, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';

const COMMON_UNITS = ['pcs', 'cap', 'kg', 'box', 'roll'];

export default function ManageCounterSuppliesModal({
  isOpen,
  onClose,
  tenant,
  onSuppliesChanged
}) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingPrices, setEditingPrices] = useState({});

  // Quick Add state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newStock, setNewStock] = useState('0');
  const [newPrice, setNewPrice] = useState('10');
  const [creating, setCreating] = useState(false);

  const fetchAllMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/items?type=RAW_MATERIAL`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMaterials(json.data);
        const priceMap = {};
        json.data.forEach(m => {
          priceMap[m.id] = String(Number(m.retailPrice || 0));
        });
        setEditingPrices(priceMap);
      }
    } catch (err) {
      toast.error('Failed to load raw materials');
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    if (isOpen) {
      fetchAllMaterials();
      setShowAddForm(false);
    }
  }, [isOpen, fetchAllMaterials]);

  if (!isOpen) return null;

  const handleToggleSellable = async (item) => {
    const nextState = !item.sellableOnCounter;
    const currentPrice = parseFloat(editingPrices[item.id] || item.retailPrice || 0);
    setUpdatingId(item.id);

    try {
      const res = await fetch(`${API_URL}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          sellableOnCounter: nextState,
          retailPrice: currentPrice
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update');

      setMaterials(prev => prev.map(m => m.id === item.id ? { ...m, sellableOnCounter: nextState } : m));
      toast.success(`${item.name} ${nextState ? 'enabled' : 'disabled'} for counter sales`);
      if (onSuppliesChanged) onSuppliesChanged();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePriceBlur = async (item) => {
    const priceNum = parseFloat(editingPrices[item.id] || 0);
    if (priceNum === Number(item.retailPrice || 0)) return;

    setUpdatingId(item.id);
    try {
      const res = await fetch(`${API_URL}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          retailPrice: priceNum
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update price');

      setMaterials(prev => prev.map(m => m.id === item.id ? { ...m, retailPrice: priceNum } : m));
      toast.success(`Rate for ${item.name} set to Rs. ${priceNum}`);
      if (onSuppliesChanged) onSuppliesChanged();
    } catch (err) {
      toast.error(err.message || 'Rate update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateNew = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
          unit: newUnit,
          type: 'RAW_MATERIAL',
          initialStock: parseFloat(newStock) || 0,
          retailPrice: parseFloat(newPrice) || 0,
          sellableOnCounter: true,
          reorderLevel: 50
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create item');

      toast.success(`"${newName}" created and enabled on counter!`);
      setNewName('');
      setNewStock('0');
      setNewPrice('10');
      setShowAddForm(false);
      await fetchAllMaterials();
      if (onSuppliesChanged) onSuppliesChanged();
    } catch (err) {
      toast.error(err.message || 'Failed to create item');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
              <Package size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Counter Supplies & Raw Materials</h3>
              <p className="text-slate-400 text-[11px]">Select items sold at counter or add new ones</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Toggle Bar */}
        <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <span className="text-xs font-semibold text-slate-600">
            {materials.filter(m => m.sellableOnCounter).length} items active on counter
          </span>
          <button
            type="button"
            onClick={() => setShowAddForm(prev => !prev)}
            className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1 font-semibold"
          >
            <Plus size={12} /> {showAddForm ? 'Cancel New' : 'Add New Raw Material'}
          </button>
        </div>

        {/* Quick Add Form Section */}
        {showAddForm && (
          <form onSubmit={handleCreateNew} className="p-3 bg-emerald-50/70 border-b border-emerald-200/80 space-y-2.5 shrink-0 animate-in fade-in duration-100">
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-900">
              <Sparkles size={13} className="text-emerald-600" />
              <span>New Counter Material</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  required
                  placeholder="Name (e.g. 19L Tap, Handle)"
                  className="input-base text-xs py-1.5 px-2 bg-white"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <select
                  className="select-base text-xs py-1.5 px-1 bg-white font-medium"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                >
                  {COMMON_UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Stock"
                  title="Initial Stock"
                  className="input-base text-xs py-1.5 px-2 bg-white font-mono"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Price (Rs)"
                  title="Counter Retail Price"
                  className="input-base text-xs py-1.5 px-2 bg-white font-mono font-bold"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save & Enable on Counter
              </button>
            </div>
          </form>
        )}

        {/* Existing Materials List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading materials...</div>
          ) : materials.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">No raw materials in system. Click &quot;Add New&quot; above.</div>
          ) : (
            materials.map(m => {
              const isUpdating = updatingId === m.id;
              const isEnabled = m.sellableOnCounter;

              return (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 text-xs ${
                    isEnabled 
                      ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200/50' 
                      : 'bg-white border-slate-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Left: Checkbox / Toggle & Info */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleSellable(m)}
                      className={`p-1 rounded cursor-pointer transition ${
                        isEnabled ? 'text-emerald-700 hover:text-emerald-800' : 'text-slate-300 hover:text-slate-500'
                      }`}
                      title={isEnabled ? 'Disable from counter sale' : 'Enable for counter sale'}
                    >
                      {isEnabled ? (
                        <ToggleRight size={22} className="text-emerald-600 fill-emerald-600" />
                      ) : (
                        <ToggleLeft size={22} className="text-slate-400" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 truncate">{m.name}</span>
                        {isEnabled && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Stock: {Number(m.cachedQty || 0).toLocaleString()} {m.unit || 'units'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Counter Price Input */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">Rs</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={isUpdating}
                      className="w-16 px-1.5 py-1 text-xs font-mono font-bold border border-slate-200 rounded bg-white text-slate-800 text-center focus:border-brand focus:ring-1 focus:ring-brand/20"
                      value={editingPrices[m.id] !== undefined ? editingPrices[m.id] : Number(m.retailPrice || 0)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingPrices(prev => ({ ...prev, [m.id]: val }));
                      }}
                      onBlur={() => handlePriceBlur(m)}
                      placeholder="Rate"
                      title="Counter Selling Price"
                    />
                    <span className="text-[10px] text-slate-400">/{m.unit || 'pc'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-xs py-1.5 px-4 font-bold"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

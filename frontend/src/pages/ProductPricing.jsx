import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Tag, 
  Droplets, 
  Package, 
  Save, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Layers,
  Building2,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { ROLES } from '../constants/roleAccess';
import { API_URL } from '../utils/api';

export default function ProductPricing() {
  const { user } = useAuth();
  const { tenant, isWadaana } = useTenant();

  // Strict role guard: only OWNER can view or edit pricing
  if (user?.role !== ROLES.OWNER) {
    return <Navigate to="/" replace />;
  }

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Map of itemId -> price string
  const [editedPrices, setEditedPrices] = useState({});

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/items?type=FINISHED_GOOD`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
        // Initialize editedPrices with current retailPrice from DB
        const initialMap = {};
        json.data.forEach(item => {
          initialMap[item.id] = String(Number(item.retailPrice || 0));
        });
        setEditedPrices(initialMap);
      } else {
        toast.error('Failed to load finished goods catalog');
      }
    } catch (err) {
      console.error('Error fetching finished goods:', err);
      toast.error('Network error loading pricing catalog');
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Compute dirty (modified) items
  const dirtyItems = useMemo(() => {
    return items.filter(item => {
      const original = Number(item.retailPrice || 0);
      const edited = parseFloat(editedPrices[item.id]);
      return !isNaN(edited) && edited !== original;
    });
  }, [items, editedPrices]);

  const hasUnsavedChanges = dirtyItems.length > 0;

  const handlePriceChange = (itemId, valStr) => {
    setEditedPrices(prev => ({
      ...prev,
      [itemId]: valStr
    }));
  };

  const adjustPriceQuick = (itemId, delta) => {
    const current = parseFloat(editedPrices[itemId] || 0);
    const updated = Math.max(0, current + delta);
    setEditedPrices(prev => ({
      ...prev,
      [itemId]: String(updated)
    }));
  };

  // Save single item price
  const handleSaveSingle = async (item) => {
    const priceNum = parseFloat(editedPrices[item.id]);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error(`Please enter a valid price for ${item.name}`);
      return;
    }

    setSavingId(item.id);
    try {
      const res = await fetch(`${API_URL}/items/${item.id}/price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({ retailPrice: priceNum })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Price updated for "${item.name}"`);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, retailPrice: priceNum } : i));
      } else {
        toast.error(json.message || 'Failed to update price');
      }
    } catch (err) {
      console.error('Error updating price:', err);
      toast.error('Network error updating price');
    } finally {
      setSavingId(null);
    }
  };

  // Save all modified items in batch
  const handleSaveAll = async () => {
    if (!hasUnsavedChanges) return;

    for (const item of dirtyItems) {
      const p = parseFloat(editedPrices[item.id]);
      if (isNaN(p) || p < 0) {
        toast.error(`Invalid price for "${item.name}". All prices must be >= 0.`);
        return;
      }
    }

    setSavingAll(true);
    try {
      const payload = dirtyItems.map(item => ({
        id: item.id,
        retailPrice: parseFloat(editedPrices[item.id])
      }));

      const res = await fetch(`${API_URL}/items/pricing/batch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({ items: payload })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Successfully saved ${dirtyItems.length} product prices!`);
        // Refresh items from backend
        await fetchItems();
      } else {
        toast.error(json.message || 'Failed to save batch pricing');
      }
    } catch (err) {
      console.error('Error in batch price update:', err);
      toast.error('Network error saving prices');
    } finally {
      setSavingAll(false);
    }
  };

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(i => 
      i.name.toLowerCase().includes(q) || 
      (i.unit && i.unit.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Highlight metric values
  const bulkWaterItem = useMemo(() => {
    return items.find(i => {
      const n = (i.name || '').toLowerCase();
      return n.includes('bulk') || n.includes('water') || (i.unit && i.unit.toLowerCase() === 'litres');
    });
  }, [items]);

  const avgPrice = useMemo(() => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, i) => acc + Number(i.retailPrice || 0), 0);
    return Math.round(sum / items.length);
  }, [items]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand/10 text-brand rounded-xl">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Product & Water Pricing
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-3 h-3" /> Owner Exclusive
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Configure database-driven retail prices for all finished goods. Drives {isWadaana ? 'Wholesale Orders' : 'Counter POS Sales & Bulk Water'}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchItems}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
            title="Refresh items from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges || savingAll}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all ${
              hasUnsavedChanges
                ? 'bg-brand text-white hover:bg-brand-dark cursor-pointer shadow-brand/20 shadow-md'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className={`w-4 h-4 ${savingAll ? 'animate-spin' : ''}`} />
            {savingAll ? 'Saving Prices...' : `Save All Changes ${hasUnsavedChanges ? `(${dirtyItems.length})` : ''}`}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Finished Goods</p>
            <p className="text-2xl font-black text-slate-900">{items.length}</p>
            <p className="text-[11px] text-slate-500">Active catalog items</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {bulkWaterItem ? 'Bulk Water Rate' : 'Catalog Average'}
            </p>
            <p className="text-2xl font-black text-slate-900">
              Rs. {bulkWaterItem ? Number(editedPrices[bulkWaterItem.id] || bulkWaterItem.retailPrice || 0) : avgPrice}
              <span className="text-xs font-normal text-slate-500 ml-1">
                {bulkWaterItem ? '/ Litre' : '/ Unit'}
              </span>
            </p>
            <p className="text-[11px] text-slate-500">
              {bulkWaterItem ? 'Live POS counter dispenser rate' : 'Average rate across finished goods'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className={`p-3 rounded-xl ${hasUnsavedChanges ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Changes</p>
            <p className={`text-2xl font-black ${hasUnsavedChanges ? 'text-amber-600' : 'text-slate-900'}`}>
              {dirtyItems.length}
            </p>
            <p className="text-[11px] text-slate-500">
              {hasUnsavedChanges ? 'Click "Save All Changes" to persist' : 'Catalog matches database'}
            </p>
          </div>
        </div>
      </div>

      {/* Contextual Notice */}
      <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-800">
            {isWadaana ? 'Wadaana Manufacturing Notice: ' : 'AquaSphere Retail Notice: '}
          </span>
          {isWadaana ? (
            <span>
              Wadaana does not operate retail counter sales. Prices set here automatically dictate the default rates for preform bottles when creating or updating <strong>Wholesale Orders</strong>.
            </span>
          ) : (
            <span>
              Prices set here are connected directly to <strong>Counter Sales (/counter-sales)</strong>. Changing bulk water or packaged bottle prices immediately updates POS cashier billing and customer receipts.
            </span>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search finished products by name or unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredItems.length} of {items.length} items
        </div>
      </div>

      {/* Pricing Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4">Type & Unit</th>
                <th className="py-3.5 px-4">Stock Available</th>
                <th className="py-3.5 px-4">Current Price</th>
                <th className="py-3.5 px-4">New Retail Price (Rs)</th>
                <th className="py-3.5 px-4">Price Difference</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand" />
                    Loading finished products and price catalog...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No finished products found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const origPrice = Number(item.retailPrice || 0);
                  const editedVal = editedPrices[item.id] !== undefined ? editedPrices[item.id] : String(origPrice);
                  const editedNum = parseFloat(editedVal);
                  const isDirty = !isNaN(editedNum) && editedNum !== origPrice;
                  const diff = isNaN(editedNum) ? 0 : editedNum - origPrice;
                  const isSavingThis = savingId === item.id;
                  const isWater = (item.name || '').toLowerCase().includes('water') || (item.name || '').toLowerCase().includes('bulk') || item.unit?.toLowerCase() === 'litres';

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/60 transition-colors ${isDirty ? 'bg-amber-50/30' : ''}`}
                    >
                      {/* Product Name & Icon */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isWater 
                              ? 'bg-sky-50 text-sky-600' 
                              : isWadaana 
                                ? 'bg-indigo-50 text-indigo-600' 
                                : 'bg-brand/10 text-brand'
                          }`}>
                            {isWater ? <Droplets className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              {item.name}
                              {isWater && (
                                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-sky-100 text-sky-700">
                                  Bulk Water
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              ID: {item.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type & Unit */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 text-[11px] capitalize">
                            {item.unit || 'units'}
                          </span>
                          <p className="text-[10px] text-slate-400">FINISHED_GOOD</p>
                        </div>
                      </td>

                      {/* Available Stock */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-800">
                            {Number(item.cachedQty || 0).toLocaleString()} {item.unit || 'units'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Factory: {Number(item.factoryQty || 0)} | Whse: {Number(item.warehouseQty || 0)}
                          </p>
                        </div>
                      </td>

                      {/* Current Active Price */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-700 font-mono">
                          Rs. {origPrice.toLocaleString()}
                        </span>
                      </td>

                      {/* Editable Price Input with Stepper */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 max-w-[200px]">
                          <button
                            type="button"
                            onClick={() => adjustPriceQuick(item.id, -5)}
                            className="w-7 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition shrink-0"
                            title="Decrease by 5"
                          >
                            -5
                          </button>

                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                              Rs.
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={editedVal}
                              onChange={(e) => handlePriceChange(item.id, e.target.value)}
                              className={`w-full pl-8 pr-2 py-1.5 text-xs font-bold font-mono rounded-lg border focus:outline-none transition ${
                                isDirty 
                                  ? 'border-amber-400 bg-amber-50/40 text-amber-900 focus:ring-2 focus:ring-amber-300' 
                                  : 'border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-brand/20 focus:border-brand'
                              }`}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => adjustPriceQuick(item.id, 5)}
                            className="w-7 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition shrink-0"
                            title="Increase by 5"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* Difference Badge */}
                      <td className="py-3.5 px-4">
                        {isDirty ? (
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            diff > 0 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {diff > 0 ? `+Rs. ${diff}` : `-Rs. ${Math.abs(diff)}`}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <CheckCircle2 className="w-3 h-3 text-slate-400" /> Unchanged
                          </span>
                        )}
                      </td>

                      {/* Row Save Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveSingle(item)}
                          disabled={!isDirty || isSavingThis || savingAll}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                            isDirty
                              ? 'bg-brand text-white hover:bg-brand-dark cursor-pointer shadow-xs'
                              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <Save className={`w-3.5 h-3.5 ${isSavingThis ? 'animate-spin' : ''}`} />
                          {isSavingThis ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

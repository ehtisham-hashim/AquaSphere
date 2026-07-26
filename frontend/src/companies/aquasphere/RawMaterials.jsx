import { useState, useEffect } from 'react';
import { Plus, X, Search, Package, Archive, RefreshCw, Edit2 } from 'lucide-react';

export default function RawMaterials() {
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    reorderLevel: 50
  });

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/items?type=RAW_MATERIAL&includeArchived=${includeArchived}`, {
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) setMaterials(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [includeArchived]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', unit: 'kg', reorderLevel: 50 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      unit: item.unit || 'kg',
      reorderLevel: parseFloat(item.reorderLevel || 0)
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Material name is required');
      return;
    }

    const url = editingItem
      ? `${import.meta.env.VITE_API_URL}/items/${editingItem.id}`
      : `${import.meta.env.VITE_API_URL}/items`;

    const method = editingItem ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, type: 'RAW_MATERIAL' }),
        credentials: 'include'
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || 'Error saving material');
        return;
      }
      setIsModalOpen(false);
      fetchMaterials();
    } catch (err) {
      alert('Failed to save raw material');
    }
  };

  const handleToggleArchive = async (item) => {
    const isArchived = !!item.archivedAt;
    const action = isArchived ? 'restore' : 'archive';
    if (!confirm(`Are you sure you want to ${action} "${item.name}"?`)) return;

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/items/${item.id}/${action}`, {
        method: 'PATCH',
        credentials: 'include'
      });
      fetchMaterials();
    } catch (err) {
      alert(`Failed to ${action} material`);
    }
  };

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Raw Material Master</h2>
          <p className="text-slate-500 text-sm">Pre-defined materials for purchasing & stock tracking</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={20} /> Add Raw Material
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="search"
            placeholder="Search material..."
            className="w-full border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-white text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          Show Archived Materials
        </label>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">Material Name</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Unit</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Current Stock</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Reorder Level</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(m => {
                const isLow = parseFloat(m.cachedQty) < parseFloat(m.reorderLevel);
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <Package size={18} />
                        </div>
                        <div className="font-bold text-slate-800">{m.name}</div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{m.unit}</td>
                    <td className="p-4 text-sm font-semibold">
                      <span className={isLow ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                        {Number(m.cachedQty).toLocaleString()} {m.unit}
                      </span>
                      {isLow && !m.archivedAt && (
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          LOW STOCK
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600">{m.reorderLevel} {m.unit}</td>
                    <td className="p-4 text-sm">
                      {m.archivedAt ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                          ARCHIVED
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Material"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(m)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            m.archivedAt
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-rose-500 hover:bg-rose-50'
                          }`}
                          title={m.archivedAt ? 'Restore Material' : 'Archive Material'}
                        >
                          {m.archivedAt ? <RefreshCw size={16} /> : <Archive size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No raw materials found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {editingItem ? 'Edit Raw Material' : 'Add Raw Material'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Material Name *</label>
                <input
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Calcium, Labels, Caps"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Measurement Unit *</label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="kg">kg (Kilograms)</option>
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="litres">litres (Litres)</option>
                  <option value="rolls">rolls (Rolls)</option>
                  <option value="boxes">boxes (Boxes)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level *</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  placeholder="50"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg text-sm">
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm text-sm">
                  {editingItem ? 'Update Material' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

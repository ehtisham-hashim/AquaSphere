export { default } from '../features/bottleLedger/BottleLedger';
  const [summary, setSummary] = useState({
    totalPurchased: 0,
    totalOwned: 0,
    atFactory: 0,
    withCustomers: 0,
    broken: 0,
    lost: 0,
    equationReconciled: true
  });

  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('ALL');

  // New Transaction Form State
  const [formData, setFormData] = useState({
    type: 'NEW_PURCHASE',
    quantity: '',
    reason: ''
  });

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/bottles/summary`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch (err) {
      console.error('Error fetching bottle summary:', err);
    }
  };

  const fetchTransactions = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/bottles/transactions?page=${page}&limit=${pagination.limit}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data);
        if (json.pagination) setPagination(json.pagination);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchTransactions(1);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchTransactions(newPage);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitTransaction = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/bottles/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setFormData({ type: 'NEW_PURCHASE', quantity: '', reason: '' });
        fetchSummary();
        fetchTransactions(1);
      } else {
        alert(json.message || 'Failed to record transaction');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while recording transaction');
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'ALL') return true;
    return t.type === filterType;
  });

  const getTxnBadge = (type) => {
    switch (type) {
      case 'NEW_PURCHASE':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-semibold">New Purchase (+)</span>;
      case 'DELIVERED_TO_CUSTOMER':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-semibold">Out to Customer</span>;
      case 'RETURNED_GOOD':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-semibold">Returned Good (-)</span>;
      case 'RETURNED_BROKEN':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-semibold">Returned Broken</span>;
      case 'MARKED_LOST':
        return <span className="bg-red-100 text-red-800 border border-red-200 px-2.5 py-1 rounded-md text-xs font-semibold">Marked Lost (-)</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-semibold">{type}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <RefreshCcw className="text-[#0ea5e9]" size={26} /> 19L Bottle Ledger & Fleet Reconciliation
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Track bottle movements, loss, factory stock, and fleet audit balance</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus size={18} /> Record Manual Movement
        </button>
      </div>

      {/* Fleet Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Owned</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{summary.totalOwned}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Purchased minus lost</div>
        </div>
        <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-2xs bg-blue-50/40">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Package size={14} /> At Factory
          </div>
          <div className="text-2xl font-extrabold text-blue-900 mt-1">{summary.atFactory}</div>
          <div className="text-[11px] text-blue-600/80 mt-0.5">Available for refill</div>
        </div>
        <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-2xs bg-indigo-50/40">
          <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <Truck size={14} /> With Customers
          </div>
          <div className="text-2xl font-extrabold text-indigo-900 mt-1">{summary.withCustomers}</div>
          <div className="text-[11px] text-indigo-600/80 mt-0.5">In market balance</div>
        </div>
        <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-2xs bg-amber-50/40">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle size={14} /> Broken
          </div>
          <div className="text-2xl font-extrabold text-amber-900 mt-1">{summary.broken}</div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">Scrap / Needs replacement</div>
        </div>
        <div className="bg-white border border-rose-100 rounded-xl p-4 shadow-2xs bg-rose-50/40">
          <div className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle size={14} /> Lost
          </div>
          <div className="text-2xl font-extrabold text-rose-900 mt-1">{summary.lost}</div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">Written off</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Purchased</div>
          <div className="text-2xl font-extrabold text-slate-700 mt-1">{summary.totalPurchased}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Lifetime acquisitions</div>
        </div>
      </div>

      {/* Fleet Reconciliation Equation Card */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        summary.equationReconciled ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50/80 border-rose-200 text-rose-900'
      }`}>
        <div className="flex items-center gap-3">
          {summary.equationReconciled ? (
            <CheckCircle className="text-emerald-600 shrink-0" size={24} />
          ) : (
            <AlertTriangle className="text-rose-600 shrink-0" size={24} />
          )}
          <div>
            <div className="font-bold text-sm tracking-wide">
              {summary.equationReconciled ? 'Fleet Equation Reconciled' : 'Fleet Discrepancy Detected'}
            </div>
            <div className="text-xs opacity-90 mt-0.5 font-mono">
              Total Owned ({summary.totalOwned}) = At Factory ({summary.atFactory}) + With Customers ({summary.withCustomers}) + Broken ({summary.broken})
            </div>
          </div>
        </div>
        <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/80 border shadow-2xs">
          Status: {summary.equationReconciled ? '100% Balanced' : 'Unreconciled'}
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Filter Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-[#0ea5e9]"
            >
              <option value="ALL">All Movement Types</option>
              <option value="NEW_PURCHASE">New Purchase</option>
              <option value="DELIVERED_TO_CUSTOMER">Delivered to Customer</option>
              <option value="RETURNED_GOOD">Returned Good</option>
              <option value="RETURNED_BROKEN">Returned Broken</option>
              <option value="MARKED_LOST">Marked Lost</option>
              <option value="AT_FACTORY_ADJUSTMENT">Factory Adjustment</option>
            </select>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing Page {pagination.page} of {pagination.pages} ({pagination.total} Records)
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Date & Time</th>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Transaction Type</th>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Quantity</th>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Customer</th>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Reason / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-medium">Loading ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-400 text-sm">
                    No bottle transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors text-sm">
                    <td className="p-4 text-slate-600">
                      {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-4">{getTxnBadge(t.type)}</td>
                    <td className="p-4 font-bold text-slate-800">{t.quantity}</td>
                    <td className="p-4 text-slate-700">
                      {t.customer ? (
                        <div>
                          <div className="font-semibold text-xs">{t.customer.name}</div>
                          <div className="text-[10px] text-slate-400">{t.customer.phone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Internal / Factory</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 text-xs truncate max-w-[250px]">
                      {t.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-xs font-medium text-slate-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Manual Movement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Record Bottle Movement</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={submitTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Movement Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-[#0ea5e9] outline-none bg-white"
                  required
                >
                  <option value="NEW_PURCHASE">New Fleet Purchase (Adds to Factory)</option>
                  <option value="MARKED_LOST">Mark Lost Bottle (Deducts Total Fleet)</option>
                  <option value="AT_FACTORY_ADJUSTMENT">Factory Manual Stock Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Quantity (Bottles) *
                </label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  value={formData.quantity}
                  onChange={handleFormChange}
                  placeholder="e.g. 50"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-[#0ea5e9] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Reason / Notes
                </label>
                <textarea
                  name="reason"
                  rows="3"
                  value={formData.reason}
                  onChange={handleFormChange}
                  placeholder="e.g., Purchased new batch from supplier XYZ"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-[#0ea5e9] outline-none resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0ea5e9] hover:bg-[#0284c7] rounded-xl transition-all shadow-xs"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

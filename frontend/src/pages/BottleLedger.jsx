import { useState, useEffect } from 'react';
import { RefreshCcw, Filter, Plus, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Package, Truck, AlertTriangle, ArrowRightLeft, ShieldAlert, FileText, UserCheck, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function BottleLedger() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    totalPurchased: 0,
    totalOwned: 0,
    atFactory: 0,
    atWarehouse: 0,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH

  const todayStr = new Date().toISOString().split('T')[0];

  // New Transaction Form State
  const [formData, setFormData] = useState({
    type: 'MOVED_TO_WAREHOUSE',
    quantity: '',
    transferDate: todayStr,
    batchNo: '',
    receivedBy: 'Warehouse Staff',
    vehicle: '',
    remarks: ''
  });

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/bottles/summary`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch (err) {
      console.error('Error fetching bottle summary:', err);
    }
  };

  const fetchTransactions = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/bottles/transactions?page=${page}&limit=${pagination.limit}`, { credentials: 'include' });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchTransactions(newPage);
    }
  };

  const getMaxAvailable = (type = formData.type) => {
    if (type === 'MOVED_TO_WAREHOUSE') return summary.atFactory || 0;
    if (type === 'MOVED_TO_FACTORY') return summary.atWarehouse || 0;
    return null;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'type') {
      const maxAvailable = getMaxAvailable(value);
      let newQty = formData.quantity;
      if (maxAvailable !== null && parseInt(newQty || 0) > maxAvailable) {
        newQty = maxAvailable > 0 ? maxAvailable.toString() : '';
        toast.info(`Quantity adjusted to available stock limit (${maxAvailable})`);
      }
      setFormData(prev => ({ ...prev, type: value, quantity: newQty }));
      return;
    }

    if (name === 'quantity') {
      const num = parseInt(value || 0);
      const maxAvailable = getMaxAvailable();
      if (maxAvailable !== null && num > maxAvailable) {
        setFormData(prev => ({ ...prev, quantity: maxAvailable > 0 ? maxAvailable.toString() : '' }));
        toast.info(`Quantity capped at available stock limit of ${maxAvailable} bottles`);
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitTransaction = async (e) => {
    e.preventDefault();
    try {
      const dateNum = (formData.transferDate || todayStr).replace(/-/g, '');
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const transferId = `TRF-${dateNum}-${randomSuffix}`;
      
      const payloadReason = JSON.stringify({
        transferId,
        batchNo: formData.batchNo.trim() || 'AQ-BATCH-AUTO',
        transferredBy: `${user?.name || 'Production Manager'} (${user?.role || 'PM'})`,
        receivedBy: formData.receivedBy.trim() || 'Warehouse Staff',
        vehicle: formData.vehicle.trim() || 'Internal Transfer',
        status: 'RECEIVED',
        remarks: formData.remarks.trim() || ''
      });

      const res = await fetch(`${API_URL}/bottles/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          quantity: formData.quantity,
          reason: payloadReason
        }),
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Transfer recorded! ID: ${transferId}`);
        setIsModalOpen(false);
        setFormData({
          type: 'MOVED_TO_WAREHOUSE',
          quantity: '',
          transferDate: todayStr,
          batchNo: '',
          receivedBy: 'Warehouse Staff',
          vehicle: '',
          remarks: ''
        });
        fetchSummary();
        fetchTransactions(1);
      } else {
        toast.error(json.message || 'Failed to record transaction');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error while recording transaction');
    }
  };

  // Parse transaction details safely
  const parseDetails = (txn) => {
    let details = {};
    if (txn.reason) {
      try {
        if (txn.reason.startsWith('{')) {
          details = JSON.parse(txn.reason);
        }
      } catch (e) {}
    }

    let batchNo = details.batchNo || null;
    if (!batchNo && txn.reason) {
      const match = txn.reason.match(/#([A-Za-z0-9-]+)/);
      if (match) {
        batchNo = `#${match[1]}`;
      }
    }
    if (!batchNo && txn.orderId) {
      batchNo = `ORDER-#${txn.orderId.substring(0, 6)}`;
    }

    return {
      transferId: details.transferId || (txn.id ? `TRF-${txn.id.substring(0, 8).toUpperCase()}` : 'TRF-AUTO'),
      batchNo: batchNo || '-',
      transferredBy: details.transferredBy || (txn.customer ? txn.customer.name : 'System Log'),
      receivedBy: details.receivedBy || 'Warehouse Staff',
      vehicle: details.vehicle || '-',
      status: details.status || 'RECEIVED',
      remarks: details.remarks || (txn.reason && !txn.reason.startsWith('{') ? txn.reason : '')
    };
  };

  const filteredTransactions = transactions.filter(t => {
    // 1. Type Filter
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    
    // 2. Search Filter (Transfer ID, Batch ID, Transferred By, Received By, Remarks)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const details = parseDetails(t);
      const matchTransferId = details.transferId.toLowerCase().includes(q);
      const matchBatchNo = details.batchNo.toLowerCase().includes(q);
      const matchTransferredBy = details.transferredBy.toLowerCase().includes(q);
      const matchReceivedBy = details.receivedBy.toLowerCase().includes(q);
      const matchRemarks = details.remarks.toLowerCase().includes(q);
      const matchCust = t.customer?.name?.toLowerCase().includes(q) || false;
      
      if (!matchTransferId && !matchBatchNo && !matchTransferredBy && !matchReceivedBy && !matchRemarks && !matchCust) {
        return false;
      }
    }

    // 3. Date Filter
    if (dateFilter !== 'ALL') {
      const txnDate = new Date(t.createdAt);
      const today = new Date();
      if (dateFilter === 'TODAY') {
        if (txnDate.toDateString() !== today.toDateString()) return false;
      } else if (dateFilter === 'WEEK') {
        const weekAgo = new Date(today.setDate(today.getDate() - 7));
        if (txnDate < weekAgo) return false;
      } else if (dateFilter === 'MONTH') {
        const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
        if (txnDate < monthAgo) return false;
      }
    }

    return true;
  });

  const getTxnBadge = (type) => {
    switch (type) {
      case 'NEW_PURCHASE':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold">New Purchase (+)</span>;
      case 'DELIVERED_TO_CUSTOMER':
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-bold">Out to Customer</span>;
      case 'RETURNED_GOOD':
        return <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-bold">Returned Good (-)</span>;
      case 'RETURNED_BROKEN':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">Returned Broken</span>;
      case 'MARKED_LOST':
        return <span className="bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded-md text-xs font-bold">Marked Lost (-)</span>;
      case 'MOVED_TO_WAREHOUSE':
        return <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-md text-xs font-bold">Factory ➔ Warehouse</span>;
      case 'MOVED_TO_FACTORY':
        return <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-md text-xs font-bold">Warehouse ➔ Factory</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-bold">{type}</span>;
    }
  };

  const role = user?.role;

  if (role === 'OWNER' || role === 'ACCOUNTANT') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto mt-12">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Access Denied</h3>
        <p className="text-sm text-slate-500 mt-1">Owner and Accountant roles do not have access to the Bottle Ledger page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 shadow-inner">
            <RefreshCcw size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {role === 'PRODUCTION_MANAGER' ? '19L Factory ➔ Warehouse Bottle Transfer' : '19L Bottle Ledger & Fleet Audit'}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
                19L Refills
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              {role === 'PRODUCTION_MANAGER' 
                ? 'Monitor factory stock and initiate verified stock transfers to warehouse'
                : 'Track bottle movements, loss, factory stock, warehouse, and fleet audit balance'
              }
            </p>
          </div>
        </div>

        {(role === 'PRODUCTION_MANAGER' || role === 'ADMIN') && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button 
              onClick={() => {
                setFormData(prev => ({ ...prev, type: 'MOVED_TO_WAREHOUSE', quantity: '' }));
                setIsModalOpen(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md text-sm active:scale-[0.98]"
            >
              <ArrowRightLeft size={18} /> Move to Warehouse
            </button>
            <button 
              onClick={() => {
                setFormData(prev => ({ ...prev, type: 'MOVED_TO_FACTORY', quantity: '' }));
                setIsModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md text-sm active:scale-[0.98]"
            >
              <ArrowRightLeft size={18} /> Move to Factory
            </button>
          </div>
        )}
      </div>

      {/* Fleet Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {role === 'ADMIN' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Owned</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{summary.totalOwned}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Purchased - lost</div>
          </div>
        )}

        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs bg-blue-50/40">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Package size={14} /> At Factory
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">{summary.atFactory}</div>
          <div className="text-[11px] text-blue-600/80 mt-0.5">Available at factory</div>
        </div>

        <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-xs bg-purple-50/40">
          <div className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
            <Package size={14} /> At Warehouse
          </div>
          <div className="text-2xl font-black text-purple-900 mt-1">{summary.atWarehouse}</div>
          <div className="text-[11px] text-purple-600/80 mt-0.5">Ready for delivery</div>
        </div>

        {(role === 'MARKETING_MANAGER' || role === 'ADMIN') && (
          <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-xs bg-indigo-50/40">
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
              <Truck size={14} /> With Customers
            </div>
            <div className="text-2xl font-black text-indigo-900 mt-1">{summary.withCustomers}</div>
            <div className="text-[11px] text-indigo-600/80 mt-0.5">In market balance</div>
          </div>
        )}

        {role === 'ADMIN' && (
          <>
            <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs bg-amber-50/40">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle size={14} /> Broken
              </div>
              <div className="text-2xl font-black text-amber-900 mt-1">{summary.broken}</div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">Scrap / Broken</div>
            </div>
            <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs bg-rose-50/40">
              <div className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={14} /> Lost
              </div>
              <div className="text-2xl font-black text-rose-900 mt-1">{summary.lost}</div>
              <div className="text-[11px] text-rose-600/80 mt-0.5">Written off</div>
            </div>
          </>
        )}

        {role === 'ADMIN' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Purchased</div>
            <div className="text-2xl font-black text-slate-700 mt-1">{summary.totalPurchased}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Lifetime acquisitions</div>
          </div>
        )}
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-purple-500 shadow-xs"
              >
                <option value="ALL">All Types</option>
                <option value="MOVED_TO_WAREHOUSE">Moved to Warehouse</option>
                <option value="MOVED_TO_FACTORY">Moved to Factory</option>
                <option value="NEW_PURCHASE">New Purchase (+)</option>
                <option value="DELIVERED_TO_CUSTOMER">Out to Customer</option>
                <option value="RETURNED_GOOD">Returned Good</option>
                <option value="RETURNED_BROKEN">Returned Broken</option>
                <option value="MARKED_LOST">Marked Lost (-)</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-purple-500 shadow-xs"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="MONTH">This Month</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Search Batch / Transfer No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-purple-500 w-64 shadow-xs"
            />
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            Page {pagination.page} of {pagination.pages} ({pagination.total} Records)
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50/90 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Date & Time</th>
                <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Transfer ID</th>
                <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Movement</th>
                <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Quantity</th>
                <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Batch Ref</th>
                <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Transferred / Received By</th>
                <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-medium">Loading ledger transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-400 text-sm font-medium">
                    No transfer logs found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const details = parseDetails(t);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors text-sm">
                      <td className="p-4 text-slate-600">
                        <span className="font-bold text-slate-800 block">{new Date(t.createdAt).toLocaleDateString()}</span>
                        <span className="text-xs text-slate-400 font-medium">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-xs font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                          {details.transferId}
                        </span>
                      </td>
                      <td className="p-4">{getTxnBadge(t.type)}</td>
                      <td className="p-4 font-black text-slate-900 text-base">
                        {['RETURNED_GOOD', 'RETURNED_BROKEN', 'MARKED_LOST'].includes(t.type) ? '-' : '+'}{t.quantity} <span className="text-xs font-normal text-slate-500">bottles</span>
                      </td>
                      <td className="p-4 font-mono text-xs font-bold text-slate-600">
                        {details.batchNo}
                      </td>
                      <td className="p-4 text-slate-700">
                        <div className="font-bold text-xs text-slate-800">{details.transferredBy}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <UserCheck size={11} className="text-emerald-600" />
                          <span>Recv: {details.receivedBy}</span>
                          {details.vehicle !== '-' && <span className="text-slate-400 ml-1">({details.vehicle})</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle size={12} /> Received
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-xs font-bold text-slate-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Movement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold">Initiate 19L Stock Transfer</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={submitTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Movement Direction *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 outline-none bg-slate-50 font-bold text-slate-800"
                  required
                >
                  <option value="MOVED_TO_WAREHOUSE">Move to Warehouse (Factory Floor ➔ Warehouse)</option>
                  <option value="MOVED_TO_FACTORY">Move to Factory (Warehouse ➔ Factory Floor)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Transfer Date *
                  </label>
                  <input
                    type="date"
                    name="transferDate"
                    value={formData.transferDate}
                    onChange={handleFormChange}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 outline-none font-bold text-slate-800 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Quantity (19L Bottles) *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    max={getMaxAvailable() !== null ? getMaxAvailable() : undefined}
                    value={formData.quantity}
                    onChange={handleFormChange}
                    placeholder={getMaxAvailable() !== null ? `Max ${getMaxAvailable()}` : "e.g. 50"}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 outline-none font-black text-slate-900 bg-white"
                    required
                  />
                </div>
              </div>

              {getMaxAvailable() !== null && (
                <div className="flex justify-between items-center text-xs font-semibold bg-purple-50 border border-purple-200 rounded-xl p-3 text-purple-900">
                  <span>Available Source Balance ({formData.type === 'MOVED_TO_WAREHOUSE' ? 'Factory' : 'Warehouse'}):</span>
                  <span className="font-bold text-purple-950 bg-white px-2.5 py-1 rounded-lg border border-purple-300">
                    {getMaxAvailable()} bottles
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Batch Reference Number
                  </label>
                  <input
                    type="text"
                    name="batchNo"
                    value={formData.batchNo}
                    onChange={handleFormChange}
                    placeholder="e.g. AQ-20260801-001"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 outline-none font-mono text-slate-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Transferred By (Auto)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${user?.name || 'Production Manager'} (${user?.role || 'PM'})`}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-slate-100 text-slate-600 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Received By (Receiver)
                  </label>
                  <input
                    type="text"
                    name="receivedBy"
                    value={formData.receivedBy}
                    onChange={handleFormChange}
                    placeholder="e.g. Warehouse Staff / John"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 outline-none text-slate-800 bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Vehicle (Optional)
                  </label>
                  <input
                    type="text"
                    name="vehicle"
                    value={formData.vehicle}
                    onChange={handleFormChange}
                    placeholder="e.g. Suzuki Pickup"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 outline-none text-slate-800 bg-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  name="remarks"
                  rows="2"
                  value={formData.remarks}
                  onChange={handleFormChange}
                  placeholder="e.g. Transferred 50 filled bottles to warehouse for evening route"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 outline-none resize-none bg-white text-slate-800"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-md active:scale-[0.98]"
                >
                  Record Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

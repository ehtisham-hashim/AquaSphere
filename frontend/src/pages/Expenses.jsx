import { useState, useEffect, useRef } from 'react';
import { 
  Plus, X, Search, Receipt, Upload, CheckCircle, Loader2, AlertCircle, 
  Calendar, Download, UserCheck, Clock
} from 'lucide-react';
import { API_URL } from '../utils/api';
import { EXPENSE_CATEGORIES, getExpenseCategoryColor } from '../constants/expenses';
import { useAuth } from '../context/AuthContext';

const API = API_URL;

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [timeRange, setTimeRange] = useState('MONTHLY'); // 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME', 'WEEKLY', 'DAILY'
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ 
    category: EXPENSE_CATEGORIES[0] || 'Fuel / Transport', 
    amount: '', 
    remarks: '', 
    expenseDate: new Date().toISOString().split('T')[0] 
  });
  
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/expenses`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setExpenses(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchExpenses(); 
  }, []);

  const resetForm = () => {
    setForm({ 
      category: EXPENSE_CATEGORIES[0] || 'Fuel / Transport', 
      amount: '', 
      remarks: '', 
      expenseDate: new Date().toISOString().split('T')[0] 
    });
    setReceiptFile(null); 
    setReceiptPreview(''); 
    setUploadedUrl(''); 
    setUploadError(''); 
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReceiptFile(file);
    setUploadedUrl('');
    setUploadError('');
    setReceiptPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : 'pdf');
  };

  const handleUpload = async () => {
    if (!receiptFile) return;
    setUploading(true); 
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('receipt', receiptFile);
      const res = await fetch(`${API}/expenses/upload-receipt`, { 
        method: 'POST', 
        body: fd, 
        credentials: 'include' 
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Upload failed');
      setUploadedUrl(json.receiptUrl);
    } catch (e) { 
      setUploadError(e.message); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!uploadedUrl) { 
      setError('Receipt photo is mandatory — please upload the receipt first.'); 
      return; 
    }
    const intAmount = Math.round(parseFloat(form.amount));
    if (isNaN(intAmount) || intAmount <= 0) {
      setError('Please enter a valid integer amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, receiptUrl: uploadedUrl, amount: intAmount })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setIsModalOpen(false); 
      resetForm(); 
      fetchExpenses();
    } catch (e) { 
      setError(e.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  // Export CSV Functionality
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) return;
    const headers = ['Date', 'Category', 'Amount (Rs)', 'Description', 'Receipt URL', 'Created By'];
    const rows = filteredExpenses.map(ex => [
      new Date(ex.createdAt).toLocaleDateString(),
      `"${ex.category.replace(/"/g, '""')}"`,
      Math.round(Number(ex.amount)),
      `"${(ex.remarks || '').replace(/"/g, '""')}"`,
      `"${ex.receiptUrl || ''}"`,
      `"${(ex.createdBy?.name || user?.name || 'System').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Time Horizon & Category Filter Logic
  const filteredExpenses = expenses.filter(ex => {
    const matchesCategory = selectedCategory === 'ALL' || ex.category === selectedCategory;
    const matchesSearch = ex.category.toLowerCase().includes(search.toLowerCase()) ||
      (ex.remarks && ex.remarks.toLowerCase().includes(search.toLowerCase()));

    const exDate = new Date(ex.createdAt);
    const now = new Date();
    
    let matchesTime = true;
    if (timeRange === 'DAILY') {
      matchesTime = exDate.toDateString() === now.toDateString();
    } else if (timeRange === 'WEEKLY') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      matchesTime = exDate >= startOfWeek;
    } else if (timeRange === 'MONTHLY') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      matchesTime = exDate >= startOfMonth;
    } else if (timeRange === 'QUARTERLY') {
      const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), currentQuarterMonth, 1);
      matchesTime = exDate >= startOfQuarter;
    } else if (timeRange === 'YEARLY') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      matchesTime = exDate >= startOfYear;
    } else if (timeRange === 'LIFETIME') {
      matchesTime = true;
    }

    return matchesCategory && matchesSearch && matchesTime;
  });

  // Calculate Metrics
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);


  const monthTotal = expenses
    .filter(e => new Date(e.createdAt) >= startOfMonth)
    .reduce((s, e) => s + Math.round(Number(e.amount || 0)), 0);

  const yearTotal = expenses
    .filter(e => new Date(e.createdAt) >= startOfYear)
    .reduce((s, e) => s + Math.round(Number(e.amount || 0)), 0);

  const filteredSum = filteredExpenses.reduce((s, e) => s + Math.round(Number(e.amount || 0)), 0);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'DAILY': return "Today's Total";
      case 'WEEKLY': return "This Week's Total";
      case 'MONTHLY': return "This Month's Total";
      case 'QUARTERLY': return "This Quarter's Total";
      case 'YEARLY': return "This Year's Total";
      case 'LIFETIME': return "Lifetime Total";
      default: return "Selected Horizon Total";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              FINANCIAL LOGISTICS
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">Operational Expense Register</h2>
          <p className="text-slate-500 text-sm">Track plant expenses with receipt verification & user attribution</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Horizon Selector */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 shadow-xs cursor-pointer"
            >
              <option value="MONTHLY">📅 Monthly (This Month)</option>
              <option value="QUARTERLY">📊 Quarterly (This Quarter)</option>
              <option value="YEARLY">🗓️ Yearly (This Year)</option>
              <option value="LIFETIME">♾️ Lifetime (All Time)</option>
              <option value="WEEKLY">📆 Weekly (This Week)</option>
              <option value="DAILY">📌 Daily (Today)</option>
            </select>
            <Clock className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button 
            onClick={handleExportCSV}
            disabled={filteredExpenses.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download size={15} /> Export CSV
          </button>

          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center gap-2"
          >
            <Plus size={18}/> Log Expense
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            {getTimeRangeLabel()}
          </span>
          <div className="text-xl font-black text-emerald-700">Rs. {filteredSum.toLocaleString()}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">This Month</span>
          <div className="text-xl font-black text-indigo-700">Rs. {monthTotal.toLocaleString()}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">This Year</span>
          <div className="text-xl font-black text-blue-700">Rs. {yearTotal.toLocaleString()}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Displaying Logs</span>
          <div className="text-xl font-black text-slate-800">{filteredExpenses.length} <span className="text-xs font-normal text-slate-400">/ {expenses.length} total</span></div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
            selectedCategory === 'ALL'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Categories
        </button>
        {EXPENSE_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
        <input 
          type="search" 
          placeholder="Search by category or description remarks..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 transition-colors shadow-xs"
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Recommended ERP Expense Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-center">Receipt Status</th>
                <th className="p-4">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.map(ex => (
                <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 text-slate-600 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(ex.createdAt).toLocaleDateString()}
                    </div>
                  </td>

                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getExpenseCategoryColor(ex.category)}`}>
                      {ex.category}
                    </span>
                  </td>

                  <td className="p-4 font-black text-emerald-700 text-base">
                    Rs. {Math.round(Number(ex.amount)).toLocaleString()}
                  </td>

                  <td className="p-4 text-slate-700 text-xs max-w-[280px] truncate">
                    {ex.remarks || '—'}
                  </td>

                  <td className="p-4 text-center">
                    {ex.receiptUrl ? (
                      <a 
                        href={ex.receiptUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200"
                      >
                        <CheckCircle size={14} className="text-emerald-600" /> View Receipt
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-bold">
                        <AlertCircle size={13} /> Missing
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <UserCheck size={14} className="text-slate-400" />
                      {ex.createdBy?.name || user?.name || 'System'}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-slate-400 text-sm">
                    No matching expense logs found for selected timeframe ({timeRange}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Log New Expense</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
                  <AlertCircle size={15}/> {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Category *</label>
                  <select 
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium outline-none focus:border-emerald-500" 
                    value={form.category} 
                    onChange={e => setForm({...form, category: e.target.value})} 
                    required
                  >
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Amount (Rs) *</label>
                  <input 
                    type="number" 
                    step="1" 
                    min="1" 
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-emerald-500" 
                    value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})} 
                    placeholder="0" 
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Expense Date *</label>
                <input 
                  type="date" 
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 font-medium" 
                  value={form.expenseDate} 
                  onChange={e => setForm({...form, expenseDate: e.target.value})} 
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Description / Remarks *</label>
                <input 
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500" 
                  value={form.remarks} 
                  onChange={e => setForm({...form, remarks: e.target.value})} 
                  placeholder="e.g. 50L Diesel for Delivery Van"
                  required
                />
              </div>

              {/* Receipt Upload — MANDATORY */}
              <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-4 space-y-3 bg-emerald-50/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                    <Receipt size={14}/> Receipt Photo <span className="text-amber-600">* MANDATORY</span>
                  </label>
                  {uploadedUrl && (
                    <span className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      <CheckCircle size={13}/> Uploaded
                    </span>
                  )}
                </div>

                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect}/>

                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 border border-slate-300 bg-white rounded-xl px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors font-bold shadow-xs"
                  >
                    <Upload size={14}/> Choose File
                  </button>

                  {receiptFile && !uploadedUrl && (
                    <button 
                      type="button" 
                      onClick={handleUpload} 
                      disabled={uploading}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-60 shadow-xs"
                    >
                      {uploading ? <><Loader2 size={13} className="animate-spin"/> Uploading...</> : 'Upload Receipt'}
                    </button>
                  )}
                </div>
                
                <p className="text-[11px] text-slate-500 mt-1">
                  Accepted formats: Images (JPEG, PNG, WEBP) or PDF • Max 5MB
                </p>

                {receiptPreview && receiptPreview !== 'pdf' && !uploadedUrl && (
                  <img src={receiptPreview} alt="preview" className="h-20 rounded-xl object-cover border border-emerald-200"/>
                )}

                {uploadedUrl && (
                  <div className="flex items-center gap-2 text-xs bg-emerald-100/70 border border-emerald-200 text-emerald-800 rounded-xl p-2.5">
                    <CheckCircle size={14} className="shrink-0 text-emerald-600" />
                    <a href={uploadedUrl} target="_blank" rel="noreferrer" className="underline truncate font-semibold">{uploadedUrl}</a>
                  </div>
                )}

                {uploadError && <div className="text-xs text-rose-600 bg-rose-50 rounded-lg p-2 font-semibold">{uploadError}</div>}

                {!uploadedUrl && !receiptFile && (
                  <p className="text-xs text-slate-500 font-medium">⚠ Text-only entries are not allowed. You must attach a receipt.</p>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 py-2.5 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting || !uploadedUrl}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  {submitting ? <><Loader2 size={14} className="animate-spin"/> Saving...</> : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

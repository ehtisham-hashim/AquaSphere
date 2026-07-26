import { useState, useEffect, useRef } from 'react';
import { Plus, X, Search, Receipt, Upload, CheckCircle, Loader2, AlertCircle, Calendar, DollarSign } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const CATEGORIES = ['Fuel', 'Salaries', 'Electricity', 'Plant Rent', 'Vehicle Repair', 'Machine Repair', 'Miscellaneous'];

const INPUT = 'w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ category: 'Fuel', amount: '', remarks: '', expenseDate: new Date().toISOString().split('T')[0] });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef(null);

  const fetchExpenses = async () => {
    const res = await fetch(`${API}/expenses`, { credentials: 'include' });
    const json = await res.json();
    if (json.success) setExpenses(json.data);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const resetForm = () => {
    setForm({ category: 'Fuel', amount: '', remarks: '', expenseDate: new Date().toISOString().split('T')[0] });
    setReceiptFile(null); setReceiptPreview(''); setUploadedUrl(''); setUploadError(''); setError('');
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
    setUploading(true); setUploadError('');
    try {
      const fd = new FormData();
      fd.append('receipt', receiptFile);
      const res = await fetch(`${API}/expenses/upload-receipt`, { method: 'POST', body: fd, credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Upload failed');
      setUploadedUrl(json.receiptUrl);
    } catch (e) { setUploadError(e.message); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!uploadedUrl) { setError('Receipt photo is mandatory — please upload the receipt first.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, receiptUrl: uploadedUrl, amount: parseFloat(form.amount) })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setIsModalOpen(false); resetForm(); fetchExpenses();
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const filtered = expenses.filter(ex =>
    ex.category.toLowerCase().includes(search.toLowerCase()) ||
    (ex.remarks && ex.remarks.toLowerCase().includes(search.toLowerCase()))
  );

  const todayTotal = expenses
    .filter(e => new Date(e.createdAt).toDateString() === new Date().toDateString())
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const categoryColors = {
    Fuel: 'bg-orange-100 text-orange-700', Salaries: 'bg-blue-100 text-blue-700',
    Electricity: 'bg-yellow-100 text-yellow-700', 'Plant Rent': 'bg-purple-100 text-purple-700',
    'Vehicle Repair': 'bg-slate-100 text-slate-700', 'Machine Repair': 'bg-red-100 text-red-700',
    Miscellaneous: 'bg-gray-100 text-gray-600'
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Expenses</h2>
          <p className="text-slate-500 text-sm">Every expense requires a receipt photo — no exceptions</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Today's Total</div>
            <div className="text-lg font-black text-red-600">Rs. {todayTotal.toLocaleString()}</div>
          </div>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm">
            <Plus size={18}/> Log Expense
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
        <input type="search" placeholder="Search by category or remarks..."
          className="w-full border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white text-sm"
          value={search} onChange={(e) => setSearch(e.target.value)}/>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600 text-xs uppercase">Category</th>
              <th className="p-4 font-semibold text-slate-600 text-xs uppercase">Amount</th>
              <th className="p-4 font-semibold text-slate-600 text-xs uppercase">Date</th>
              <th className="p-4 font-semibold text-slate-600 text-xs uppercase">Remarks</th>
              <th className="p-4 font-semibold text-slate-600 text-xs uppercase text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(ex => (
              <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${categoryColors[ex.category] || 'bg-slate-100 text-slate-600'}`}>
                    {ex.category}
                  </span>
                </td>
                <td className="p-4 font-bold text-red-600">Rs. {parseFloat(ex.amount).toLocaleString()}</td>
                <td className="p-4 text-slate-500 text-xs">
                  <div className="flex items-center gap-1"><Calendar size={13}/>{new Date(ex.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="p-4 text-slate-500 text-xs max-w-[200px] truncate">{ex.remarks || '—'}</td>
                <td className="p-4 text-right">
                  {ex.receiptUrl ? (
                    <a href={ex.receiptUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline font-semibold">
                      <Receipt size={13}/> View
                    </a>
                  ) : (
                    <span className="text-slate-300 text-xs flex items-center gap-1 justify-end">
                      <AlertCircle size={13}/> Missing
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" className="p-10 text-center text-slate-400 text-sm">No expenses found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="bg-red-600 px-5 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold">Log New Expense</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-red-200 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                  <AlertCircle size={15}/> {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category *</label>
                  <select className={INPUT} value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Amount (Rs) *</label>
                  <input type="number" step="0.01" min="0.01" className={INPUT} value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" required/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
                <input type="date" className={INPUT} value={form.expenseDate} onChange={e => setForm({...form, expenseDate: e.target.value})} required/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Remarks</label>
                <input className={INPUT} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} placeholder="Optional details..."/>
              </div>

              {/* Receipt Upload — MANDATORY */}
              <div className="border-2 border-dashed border-red-200 rounded-xl p-4 space-y-3 bg-red-50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1">
                    <Receipt size={14}/> Receipt Photo <span className="text-red-500">* MANDATORY</span>
                  </label>
                  {uploadedUrl && <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold"><CheckCircle size={13}/> Uploaded</span>}
                </div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect}/>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 border border-red-300 bg-white rounded-lg px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium">
                    <Upload size={14}/> Choose File
                  </button>
                  {receiptFile && !uploadedUrl && (
                    <button type="button" onClick={handleUpload} disabled={uploading}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60">
                      {uploading ? <><Loader2 size={13} className="animate-spin"/> Uploading...</> : 'Upload Receipt'}
                    </button>
                  )}
                </div>
                {receiptPreview && receiptPreview !== 'pdf' && !uploadedUrl && (
                  <img src={receiptPreview} alt="preview" className="h-20 rounded-lg object-cover border border-red-200"/>
                )}
                {uploadedUrl && (
                  <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-2">
                    <CheckCircle size={13}/>
                    <a href={uploadedUrl} target="_blank" rel="noreferrer" className="underline truncate">{uploadedUrl}</a>
                  </div>
                )}
                {uploadError && <div className="text-xs text-red-600 bg-red-50 rounded p-2">{uploadError}</div>}
                {!uploadedUrl && !receiptFile && (
                  <p className="text-xs text-red-500 font-medium">⚠ Text-only entries are not allowed. You must attach a receipt.</p>
                )}
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 py-2.5 text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting || !uploadedUrl}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
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

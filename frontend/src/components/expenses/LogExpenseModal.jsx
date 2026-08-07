import { useState, useRef } from 'react';
import { X, Receipt, Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { API_URL } from '../../utils/api';
import { EXPENSE_CATEGORIES } from '../../constants/expenses';

const API = API_URL;

export default function LogExpenseModal({ isOpen, onClose, onSaved, tenant = 'aquasphere' }) {
  const isWadaana = tenant === 'wadaana';
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

  if (!isOpen) return null;

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

  const handleClose = () => {
    resetForm();
    onClose();
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
        headers: { 'x-tenant': tenant },
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
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({ ...form, receiptUrl: uploadedUrl, amount: intAmount })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      resetForm(); 
      onSaved();
    } catch (e) { 
      setError(e.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">Log New Expense</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
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
          <div className={`border-2 border-dashed rounded-2xl p-4 space-y-3 ${
            isWadaana ? 'border-sky-200 bg-sky-50/40' : 'border-emerald-200 bg-emerald-50/40'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${
                isWadaana ? 'text-sky-800' : 'text-emerald-800'
              }`}>
                <Receipt size={14}/> Receipt Photo <span className="text-amber-600">* MANDATORY</span>
              </label>
              {uploadedUrl && (
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                  isWadaana ? 'text-sky-700 bg-sky-100' : 'text-emerald-700 bg-emerald-100'
                }`}>
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
                  className={`flex items-center gap-2 ${
                    isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  } text-white rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-60 shadow-xs`}
                >
                  {uploading ? <><Loader2 size={13} className="animate-spin"/> Uploading...</> : 'Upload Receipt'}
                </button>
              )}
            </div>
            
            <p className="text-[11px] text-slate-500 mt-1">
              Accepted formats: Images (JPEG, PNG, WEBP) or PDF • Max 5MB
            </p>

            {receiptPreview && receiptPreview !== 'pdf' && !uploadedUrl && (
              <img src={receiptPreview} alt="preview" className="h-20 rounded-xl object-cover border border-slate-200"/>
            )}

            {uploadedUrl && (
              <div className={`flex items-center gap-2 text-xs border rounded-xl p-2.5 ${
                isWadaana ? 'bg-sky-100/70 border-sky-200 text-sky-800' : 'bg-emerald-100/70 border-emerald-200 text-emerald-800'
              }`}>
                <CheckCircle size={14} className={`shrink-0 ${isWadaana ? 'text-sky-600' : 'text-emerald-600'}`} />
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
              onClick={handleClose}
              className="flex-1 py-2.5 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting || !uploadedUrl}
              className={`flex-1 py-2.5 ${
                isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'
              } text-white rounded-xl text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md transition-colors`}
            >
              {submitting ? <><Loader2 size={14} className="animate-spin"/> Saving...</> : 'Log Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

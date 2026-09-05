import { useState, useRef } from 'react';
import { X, Receipt, Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { API_URL } from '../../utils/api';
import { EXPENSE_CATEGORIES } from '../../constants/expenses';
import { useTenant } from '../../context/TenantContext';

const API = API_URL;

export default function LogExpenseModal({ isOpen, onClose, onSaved }) {
  const { tenant, isWadaana } = useTenant();
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="card-surface w-full max-w-md shadow-2xl overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-base text-slate-800">Log New Expense</h3>
            <span className="badge-brand mt-0.5">
              {isWadaana ? 'WADAANA' : 'AQUASPHERE'}
            </span>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg">
            <X size={18}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-sm">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
              <AlertCircle size={15}/> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-xs">Category *</label>
              <select 
                className="select-base text-xs py-2" 
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
                className="input-base text-xs py-2 font-mono font-bold" 
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
              className="input-base text-xs py-2 font-medium" 
              value={form.expenseDate} 
              onChange={e => setForm({...form, expenseDate: e.target.value})} 
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 text-xs">Description / Remarks *</label>
            <input 
              className="input-base text-xs py-2" 
              value={form.remarks} 
              onChange={e => setForm({...form, remarks: e.target.value})} 
              placeholder="e.g. 50L Diesel for Delivery Van"
              required
            />
          </div>

          {/* Receipt Upload — MANDATORY */}
          <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-1 text-slate-700">
                <Receipt size={14} className="text-brand-primary"/> Receipt Photo <span className="text-amber-600">* MANDATORY</span>
              </label>
              {uploadedUrl && (
                <span className="badge-brand">
                  <CheckCircle size={12}/> Uploaded
                </span>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect}/>

            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => fileRef.current?.click()}
                className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Upload size={13}/> Choose File
              </button>

              {receiptFile && !uploadedUrl && (
                <button 
                  type="button" 
                  onClick={handleUpload} 
                  disabled={uploading}
                  className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  {uploading ? <><Loader2 size={13} className="animate-spin"/> Uploading...</> : 'Upload Receipt'}
                </button>
              )}
            </div>
            
            <p className="text-[11px] text-slate-400">
              Accepted formats: Images (JPEG, PNG, WEBP) or PDF • Max 5MB
            </p>

            {receiptPreview && receiptPreview !== 'pdf' && !uploadedUrl && (
              <img src={receiptPreview} alt="preview" className="h-16 rounded-lg object-cover border border-slate-200"/>
            )}

            {uploadedUrl && (
              <div className="flex items-center gap-2 text-xs border rounded-lg p-2 bg-brand-light border-brand-light text-brand-primary">
                <CheckCircle size={14} className="shrink-0 text-brand-primary" />
                <a href={uploadedUrl} target="_blank" rel="noreferrer" className="underline truncate font-semibold">{uploadedUrl}</a>
              </div>
            )}

            {uploadError && <div className="text-xs text-rose-600 bg-rose-50 rounded-lg p-2 font-semibold">{uploadError}</div>}

            {!uploadedUrl && !receiptFile && (
              <p className="text-xs text-slate-500 font-medium">⚠ Text-only entries are not allowed. You must attach a receipt.</p>
            )}
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={handleClose}
              className="btn-secondary flex-1 text-xs py-2.5"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting || !uploadedUrl}
              className="btn-primary flex-1 text-xs py-2.5 disabled:opacity-50"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin"/> Saving...</> : 'Log Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import {
  X, Upload, Download, Check, FileSpreadsheet,
  AlertCircle, CheckCircle2, Sparkles, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL, clearCache } from '../../utils/api';
import { useTenant } from '../../context/TenantContext';

export default function BulkImportCustomersModal({ isOpen, onClose, onImportSuccess, existingCustomers = [], marketers: propMarketers = [] }) {
  const { tenant, isWadaana } = useTenant();
  const fileInputRef = useRef(null);

  const [marketers, setMarketers] = useState(propMarketers);
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMarketers = async () => {
      try {
        const res = await fetch(`${API_URL}/customers/marketers`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (isMounted && json.success && json.data?.marketers) {
          setMarketers(json.data.marketers);
        }
      } catch (err) {
        console.error('Failed to load marketers for bulk import prompt:', err);
      }
    };
    if (isOpen) {
      fetchMarketers();
    }
    return () => { isMounted = false; };
  }, [isOpen, tenant]);

  if (!isOpen) return null;

  const existingPhones = new Set(
    existingCustomers
      .filter(c => !c.archivedAt && c.phone)
      .map(c => String(c.phone).replace(/[^\d]/g, ''))
  );

  const normalizePhone = (raw) => {
    if (!raw) return '';
    let d = String(raw).trim().replace(/[^\d+]/g, '');
    if (d.startsWith('+92')) d = '0' + d.slice(3);
    else if (d.startsWith('92') && d.length === 12) d = '0' + d.slice(2);
    else if (d.startsWith('3') && d.length === 10) d = '0' + d;
    return d;
  };

  const getAiPrompt = () => {
    const headers = isWadaana
      ? 'name,phone,type,address,mapLink,securityDeposit,currentBalance,creditDuration,marketerRef,qtyPure05L,qtyPure15L,qtyMix05L,qtyMix15L,qtyPureFine05L,qtyPureFine15L,buyerNtn,buyerStrn,remarks'
      : 'name,phone,type,address,mapLink,securityDeposit,currentBalance,cachedBottleBalance,creditDuration,marketerRef,qty19L,qty05LPet,qty15LPet,buyerNtn,buyerStrn,remarks';

    const registeredMarketersList = marketers.length > 0
      ? marketers.map(m => `  * "${m.id} • ${m.name}" (${m.segment || 'General'})`).join('\n')
      : '  * (No custom marketers registered yet in database)';

    return [
      `You are a data-cleaning assistant for ${isWadaana ? 'Wadaana ERP' : 'AquaSphere ERP'}.`,
      `Convert the raw customer list I paste below into a strictly valid RFC-4180 CSV file that I can upload directly into the ERP.`,
      ``,
      `STRICT RULES:`,
      `1. Output ONLY a single fenced \`\`\`csv code block with NO extra commentary before or after.`,
      `2. Use these exact column headers on Row 1:`,
      headers,
      `3. Column formatting rules:`,
      `- name: Required. Full customer or business name in double quotes (e.g., "Al-Madina Mart").`,
      `- phone: Required. Normalize all Pakistani phone numbers to 11 digits starting with 03 (e.g., convert "+92 300 1234567" or "0300-1234567" to "03001234567").`,
      `- type: Must be one of: Home, Commercial, Corporate, Distributor, Industrial.`,
      `- address: Wrap in double quotes if it contains commas (e.g., "House 12, Street 4, Hassan Abdal").`,
      `- mapLink: Google Maps URL if available, otherwise "".`,
      `- securityDeposit: Whole integer in PKR (default 0).`,
      `- currentBalance: Opening unpaid debt (Udhaar) owed by customer in PKR (default 0).`,
      ...(!isWadaana ? [`- cachedBottleBalance: Number of empty 19L returnable bottles currently held by the customer (default 0).`] : []),
      `- creditDuration: Allowed credit days as an integer (default 7).`,
      `- marketerRef: Marketer attribution. CRITICAL TO PREVENT DUPLICATES:`,
      `  Match against the existing registered marketers below. If raw data mentions one of these people (or any close variation/nickname), you MUST map it to their exact registered string:`,
      `  * "DIRECT" (Company Direct / No Marketer)`,
      registeredMarketersList,
      `  If a customer was referred by someone completely new NOT listed above, write their clean full name (e.g. "Muhammad Usman") and the ERP will automatically register them as a new marketer.`,
      ...(isWadaana
        ? [
            `- qtyPure05L, qtyPure15L, qtyMix05L, qtyMix15L, qtyPureFine05L, qtyPureFine15L: Expected bottle quantities per order (integer, default 0).`
          ]
        : [
            `- qty19L, qty05LPet, qty15LPet: Expected quantities per order (integer, default 0).`
          ]),
      `- buyerNtn, buyerStrn: FBR tax numbers if known, otherwise "".`,
      `- remarks: Any delivery days or notes wrapped in double quotes.`,
      `4. Deduplicate rows with the exact same phone number.`,
      ``,
      `Here is my raw customer data to convert:`,
      `[PASTE YOUR RAW EXCEL / WHATSAPP / LEDGER DATA HERE]`
    ].join('\n');
  };

  const handleCopyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(getAiPrompt());
      setCopiedPrompt(true);
      toast.success('AI formatting prompt copied! Paste it into ChatGPT, Claude, or Gemini with your raw data.');
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch {
      toast.error('Failed to copy prompt to clipboard');
    }
  };

  const handleDownloadTemplate = () => {
    const sampleMarketer = marketers.length > 0 ? `${marketers[0].id} • ${marketers[0].name}` : 'Tariq Mehmood';
    const csvContent = isWadaana
      ? [
          'name,phone,type,address,mapLink,securityDeposit,currentBalance,creditDuration,marketerRef,qtyPure05L,qtyPure15L,qtyMix05L,qtyMix15L,qtyPureFine05L,qtyPureFine15L,buyerNtn,buyerStrn,remarks',
          `"Khyber Beverages Wholesale","03005556677","Distributor","Industrial Estate, Hattar","",0,25000,15,"${sampleMarketer}",1000,500,2000,1000,0,0,"7654321-0","12-34-5678-901-23","B2B Preform Distributor"`,
          '"Shaheen Traders","03458889900","Commercial","Circular Road, Abbottabad","",0,0,7,"DIRECT",0,0,500,500,200,200,"","","Weekly preform dispatch"'
        ].join('\n')
      : [
          'name,phone,type,address,mapLink,securityDeposit,currentBalance,cachedBottleBalance,creditDuration,marketerRef,qty19L,qty05LPet,qty15LPet,buyerNtn,buyerStrn,remarks',
          `"Al-Madina Cash & Carry","03005123456","Commercial","Main GT Road, Hassan Abdal","https://maps.google.com/?q=33.823,72.689",3000,1500,3,7,"${sampleMarketer}",5,10,5,"1234567-8","","Deliver every Tuesday & Friday"`,
          '"Dr. Kamran Clinic","03219876543","Corporate","Street 4, Cantt Area","",2000,0,2,14,"DIRECT",2,0,0,"","","Morning delivery before 11 AM"'
        ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenant}_customers_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Sample CSV template downloaded!');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const rows = results.data || [];
        const seen = new Set();
        const annotated = rows.map((r, idx) => {
          const name = String(r.name || r.Name || r.customer_name || r['Customer Name'] || '').trim();
          const rawPhone = String(r.phone || r.Phone || r.mobile || r['Phone Number'] || '').trim();
          const phone = normalizePhone(rawPhone);
          let status = 'VALID';
          let reason = 'Ready to import';

          if (!name) {
            status = 'INVALID';
            reason = 'Missing name';
          } else if (!phone || phone.length < 7) {
            status = 'INVALID';
            reason = 'Invalid phone';
          } else if (seen.has(phone)) {
            status = 'DUPLICATE_CSV';
            reason = 'Duplicate in CSV';
          } else if (existingPhones.has(phone)) {
            status = 'EXISTS_DB';
            reason = 'Already in DB';
          } else {
            seen.add(phone);
          }

          return {
            ...r,
            _rowNum: idx + 2,
            _cleanName: name,
            _cleanPhone: phone || rawPhone,
            _status: status,
            _reason: reason
          };
        });
        setParsedRows(annotated);
      },
      error: (err) => {
        toast.error(`Failed to parse CSV: ${err.message}`);
      }
    });
  };

  const validCount = parsedRows.filter(r => r._status === 'VALID').length;
  const skippedCount = parsedRows.length - validCount;

  const handleConfirmImport = async () => {
    if (validCount === 0) {
      toast.error('No valid new customer rows to import.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/customers/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': tenant
        },
        credentials: 'include',
        body: JSON.stringify({ rows: parsedRows })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Bulk import failed');
      }

      clearCache('customers');
      clearCache('bottles');
      clearCache('analytics');
      clearCache('reports');
      clearCache('admin');

      setImportResult(json.data);
      toast.success(json.message || `Imported ${json.data.importedCount} customers!`);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      toast.error(err.message || 'Error importing customers');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Bulk Customer CSV Import</h3>
              <p className="text-xs text-slate-500">
                Owner-only bulk import with automatic {isWadaana ? 'WAD313' : 'JAM313'} customer code assignment
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Action Tools: Download Template & Copy AI Prompt (Uncluttered, No Walls of Text) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300 transition-all flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 group-hover:text-brand transition-colors">
                  <Download size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Download CSV Template</div>
                  <div className="text-[11px] text-slate-500">Pre-formatted columns for {isWadaana ? 'Wadaana B2B' : 'AquaSphere'}</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleCopyAiPrompt}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between group text-left ${
                copiedPrompt
                  ? 'border-emerald-300 bg-emerald-50/80 text-emerald-900'
                  : 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50/90 text-indigo-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg border transition-colors ${
                  copiedPrompt
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-white border-indigo-200 text-indigo-600'
                }`}>
                  {copiedPrompt ? <Check size={16} /> : <Sparkles size={16} />}
                </div>
                <div>
                  <div className="text-xs font-bold">
                    {copiedPrompt ? 'AI Prompt Copied to Clipboard!' : 'Copy AI Formatting Prompt'}
                  </div>
                  <div className="text-[11px] opacity-80">
                    Paste into ChatGPT, Claude, or Gemini (includes {marketers.length} registered marketers)
                  </div>
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                copiedPrompt ? 'bg-emerald-200/70 text-emerald-800' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {copiedPrompt ? 'Copied!' : 'Copy'}
              </span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-brand rounded-2xl p-6 text-center cursor-pointer bg-slate-50/40 hover:bg-slate-50 transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload size={24} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-bold text-slate-800">
              {fileName ? `Selected: ${fileName} (${parsedRows.length} rows detected)` : 'Click to select your .CSV customer file'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Supports standard UTF-8 CSV up to 2,000 customers. Duplicate phone numbers are automatically detected and skipped.
            </p>
          </div>

          {/* Live Validation & Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-slate-800">Preview & Validation ({parsedRows.length} rows)</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    ✓ {validCount} Ready
                  </span>
                  {skippedCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                      ⚠ {skippedCount} Will Skip
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Marketer</th>
                      <th className="p-2.5 text-right">Debt (Rs)</th>
                      <th className="p-2.5 text-right">Deposit (Rs)</th>
                      {!isWadaana && <th className="p-2.5 text-center">Custody Btls</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 100).map((row) => (
                      <tr key={row._rowNum} className={row._status === 'VALID' ? 'bg-white hover:bg-slate-50/60' : 'bg-rose-50/40 text-slate-400'}>
                        <td className="p-2.5 font-mono text-[11px]">#{row._rowNum}</td>
                        <td className="p-2.5">
                          {row._status === 'VALID' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 size={11} /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <AlertCircle size={11} /> {row._reason}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-bold text-slate-800">{row._cleanName || '—'}</td>
                        <td className="p-2.5 font-mono">{row._cleanPhone || '—'}</td>
                        <td className="p-2.5">{row.type || 'Home'}</td>
                        <td className="p-2.5">{row.marketerRef || 'DIRECT'}</td>
                        <td className="p-2.5 text-right font-mono">{Number(row.currentBalance || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono">{Number(row.securityDeposit || 0).toLocaleString()}</td>
                        {!isWadaana && (
                          <td className="p-2.5 text-center font-mono font-bold">{Number(row.cachedBottleBalance || 0)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Post-Import Result Banner */}
          {importResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Import Complete: {importResult.importedCount} Customers Added!</span>
              </div>
              {importResult.skippedCount > 0 && (
                <p className="text-[11px] text-emerald-800">
                  {importResult.skippedCount} row(s) were skipped because their phone numbers already existed or were invalid.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">
            Close
          </button>
          <button
            type="button"
            disabled={submitting || validCount === 0}
            onClick={handleConfirmImport}
            className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 font-bold disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span>{submitting ? 'Importing Customers...' : `Import ${validCount} Valid Customer(s)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

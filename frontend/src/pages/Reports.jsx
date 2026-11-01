import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_URL } from '../utils/api';
import { useTenant } from '../context/TenantContext';
import { useLiveEvent } from '../context/SSEContext';
import { 
  Download, TrendingUp, DollarSign, 
  Package, Settings, Users, Truck, AlertCircle, Printer,
  CreditCard, Layers, Award, Receipt
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend 
} from 'recharts';
import { PageHeader, DateRangePicker } from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/common/TablePagination';

const ALL_REPORT_TABS = [
  { id: 'sales', label: 'Sales & Collections', icon: TrendingUp },
  { id: 'marketers', label: 'Marketer Commissions', icon: Award },
  { id: 'credit', label: 'Customer Credit (Udhaar)', icon: Users },
  { id: 'profitability', label: 'Profitability (P&L)', icon: DollarSign },
  { id: 'production', label: 'Production & Scrap', icon: Settings },
  { id: 'expenses', label: 'Operating Expenses', icon: AlertCircle },
  { id: 'inventory', label: 'Inventory Health', icon: Package },
  { id: 'vendor', label: 'Vendor Payables', icon: Truck },
  { id: 'fleet', label: '19L Bottle Fleet', icon: Package, aquasphereOnly: true }
];

export default function Reports() {
  const { tenant, isWadaana } = useTenant();
  const [activeTab, setActiveTab] = useState('sales');
  const [salesView, setSalesView] = useState('orders'); // 'orders' | 'inflows'
  
  // Date range state initialized to current month
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const formatDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
  });
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dynamic brand colors based on tenant
  const brandColor = isWadaana ? '#0284c7' : '#059669';
  const brandAccent = isWadaana ? '#38bdf8' : '#34d399';

  // Available tabs respecting tenant
  const availableTabs = useMemo(() => {
    return ALL_REPORT_TABS.filter(t => !t.aquasphereOnly || !isWadaana);
  }, [isWadaana]);

  // Data fetching
  const fetchReport = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const url = `${API_URL}/reports/${activeTab}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      const res = await fetch(url, { 
        headers: { 'x-tenant': tenant },
        credentials: 'include' 
      });
      const data = await res.json();
      
      if (data.success) {
        setReportData(data.data);
      } else {
        setError(data.message || 'Failed to load report data');
        setReportData(null);
      }
    } catch (_err) {
      setError('Network error loading report');
      setReportData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeTab, dateRange.startDate, dateRange.endDate, tenant]);

  const fetchData = fetchReport;
  useLiveEvent(['ORDER_UPDATED', 'INVENTORY_CHANGED', 'PRODUCTION_UPDATED', 'DAILY_CLOSE_CHANGED'], () => fetchData(true));

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Active table view: either regular report table or itemized Collections & Inflows Ledger
  const displayTable = useMemo(() => {
    if (!reportData) return [];
    if (activeTab === 'sales' && salesView === 'inflows') {
      const ledger = reportData.secondaryBreakdown?.inflowLedger || [];
      return ledger.map(item => ({
        'Receipt / Ref ID': item.refId,
        'Date': new Date(item.date).toLocaleDateString() + ' ' + new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        'Source Type': item.sourceType,
        'Customer Code': item.customerCode || '—',
        'Customer Name': item.customerName || 'Customer',
        'Payment Channel': item.channel,
        'Amount Collected (Rs)': item.amount
      }));
    }
    return reportData.table || [];
  }, [reportData, activeTab, salesView]);

  const pagination = usePagination(displayTable, 50, `${activeTab}_${salesView}_${dateRange.startDate}_${dateRange.endDate}`);

  // CSV Exporter
  const handleExportCSV = () => {
    if (!displayTable || displayTable.length === 0) return;
    
    const headers = Object.keys(displayTable[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of displayTable) {
      const values = headers.map(header => {
        const val = row[header];
        const str = String(val === undefined || val === null ? '' : val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(values.join(','));
    }

    if (salesView === 'inflows' && activeTab === 'sales') {
      const totalAmt = displayTable.reduce((sum, r) => sum + Number(r['Amount Collected (Rs)'] || 0), 0);
      csvRows.push(`"TOTAL INFLOWS","","","","","","Rs. ${totalAmt.toLocaleString()}"`);
    } else if (reportData?.summaryRow) {
      const summaryValues = headers.map(header => {
        const val = reportData.summaryRow[header];
        const str = String(val === undefined || val === null ? '' : val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(summaryValues.join(','));
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${activeTab}_${salesView === 'inflows' ? 'inflows_ledger' : 'report'}_${dateRange.startDate}_${dateRange.endDate}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Payment channel totals calculation
  const paymentTotals = useMemo(() => {
    if (!reportData?.secondaryBreakdown?.byPaymentMethod) return { total: 0, items: [] };
    const raw = reportData.secondaryBreakdown.byPaymentMethod;
    const total = Object.values(raw).reduce((sum, v) => sum + Number(v || 0), 0);
    const items = Object.entries(raw).map(([method, amount]) => ({
      method,
      amount: Number(amount || 0),
      percent: total > 0 ? Math.round((Number(amount || 0) / total) * 100) : 0
    })).filter(i => i.amount > 0 || ['CASH', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER'].includes(i.method));
    return { total, items };
  }, [reportData]);

  // Channel badge colors helper
  const getChannelBadge = (channel) => {
    switch (channel) {
      case 'CASH':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EASYPAISA':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'JAZZCASH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'BANK_TRANSFER':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'CHEQUE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Streamlined, Responsive Action Header */}
      <PageHeader
        title="Reports & Analytics Suite"
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Interactive Mobiscroll-style Date Range Picker */}
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={({ startDate, endDate }) => {
                setDateRange({ startDate, endDate });
              }}
            />

            <button
              onClick={() => window.print()}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 shadow-2xs"
              title="Print A4 Report"
            >
              <Printer size={13} /> Print A4
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!displayTable || displayTable.length === 0}
              className="btn-primary"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar Tabs - Tenant Brand Styled */}
        <div className="lg:w-60 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
          {availableTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSalesView('orders');
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left shrink-0 ${
                  isActive 
                    ? 'bg-brand text-white font-bold shadow-2xs' 
                    : 'text-slate-600 hover:bg-brand-light/40 hover:text-brand bg-white border border-slate-100'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Report Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {loading ? (
            <div className="card-surface p-12 text-center text-slate-400 text-sm">
              <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Generating accurate real-time report...
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-600 flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : reportData ? (
            <>
              {/* KPI Cards */}
              {reportData.kpis && reportData.kpis.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {reportData.kpis.map((kpi, idx) => (
                    <div key={idx} className="card-surface p-4">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</h4>
                      <p className="text-xl font-black font-mono text-slate-800">{kpi.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 2-COLUMN VISUAL INTELLIGENCE SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Card: Recharts Visual Chart */}
                {reportData.chartData && reportData.chartData.length > 0 && (
                  <div className="card-surface p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-brand" />
                        {activeTab === 'sales' ? 'Daily Billed vs. Cash Collections Trend' :
                         activeTab === 'marketers' ? 'Marketer Performance Comparison' :
                         activeTab === 'credit' ? 'Top Debtors Exposure' :
                         activeTab === 'profitability' ? 'Income & Expense Breakdown' :
                         activeTab === 'expenses' ? 'Expenses by Category' :
                         activeTab === 'production' ? 'Production Yield & Waste' :
                         activeTab === 'inventory' ? 'Inventory Stock vs Reorder' :
                         activeTab === 'vendor' ? 'Vendor Payables Distribution' :
                         activeTab === 'fleet' ? '19L Asset Distribution' :
                         'Analytics Overview'}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Metrics</span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        {activeTab === 'sales' ? (
                          <BarChart data={reportData.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} angle={-20} textAnchor="end" height={35} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip 
                              formatter={(value, name) => [`Rs. ${Number(value).toLocaleString()}`, name]}
                              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Bar dataKey="Billed" fill={brandColor} radius={[4, 4, 0, 0]} name="Billed Sales (Rs)" />
                            <Bar dataKey="Collected" fill={brandAccent} radius={[4, 4, 0, 0]} name="Cash Collections (Rs)" />
                          </BarChart>
                        ) : activeTab === 'marketers' ? (
                          <BarChart data={reportData.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-20} textAnchor="end" height={35} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip 
                              formatter={(value, name) => [`Rs. ${Number(value).toLocaleString()}`, name]}
                              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Bar dataKey="BilledSales" fill="#6366f1" radius={[4, 4, 0, 0]} name="Billed Sales" />
                            <Bar dataKey="CashCollected" fill={brandColor} radius={[4, 4, 0, 0]} name="Cash Collected" />
                            <Bar dataKey="UnpaidDebt" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Outstanding Debt" />
                          </BarChart>
                        ) : activeTab === 'credit' ? (
                          <BarChart data={reportData.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-20} textAnchor="end" height={35} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip 
                              formatter={(value, name) => [`Rs. ${Number(value).toLocaleString()}`, name]}
                              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Bar dataKey="Debt" fill="#ef4444" radius={[4, 4, 0, 0]} name="Outstanding Debt" />
                            <Bar dataKey="Limit" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Credit Limit" />
                          </BarChart>
                        ) : (
                          <BarChart data={reportData.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-20} textAnchor="end" height={35} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip 
                              formatter={(value, name) => [`Rs. ${Number(value).toLocaleString()}`, name]}
                              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="value" fill={brandColor} radius={[4, 4, 0, 0]} name="Amount" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Right Card: Multi-Channel Collections & Product Breakdown */}
                {activeTab === 'sales' && (
                  <div className="space-y-4">
                    {/* Collections by Payment Channel Card */}
                    <div className="card-surface p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CreditCard size={14} className="text-brand" />
                          Collections by Payment Channel
                        </h4>
                        <span className="font-mono text-xs font-extrabold text-brand bg-brand-light px-2 py-0.5 rounded-md border border-brand-border">
                          Rs. {paymentTotals.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {paymentTotals.items.map(ch => (
                          <div key={ch.method} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium text-slate-700">
                              <span className="font-bold">{ch.method.replace('_', ' ')}</span>
                              <span className="font-mono font-bold">Rs. {ch.amount.toLocaleString()} ({ch.percent}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-brand rounded-full" style={{ width: `${ch.percent}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Finished Goods Volume Card (Dynamic Catalog Sync) */}
                    <div className="card-surface p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={14} className="text-indigo-600" />
                          Sales Volume by Finished Good
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Catalog Live</span>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {(reportData.secondaryBreakdown?.byProduct || []).map(p => (
                          <div key={p.itemId} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-xl text-xs">
                            <div>
                              <div className="font-bold text-slate-800">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Pack Size: {p.packSize} • {p.unit}</div>
                            </div>
                            <div className="text-right font-mono">
                              <div className="font-extrabold text-slate-900">{p.qtySold.toLocaleString()} {p.unit}s</div>
                              <div className="text-[10px] text-brand font-bold">Rs. {p.billedRevenue.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'marketers' && (
                  <div className="card-surface p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Award size={14} className="text-amber-500" /> Marketer Attribution Highlights
                    </h4>
                    <p className="text-xs text-slate-500">
                      All customers assigned with <span className="font-mono font-bold text-slate-800">MKT-xx</span> badges are tracked here with dual identification (<span className="font-mono text-slate-800">JAM313xxxx • MKT-xx</span>).
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                        <div className="text-[10px] font-bold text-indigo-700 uppercase">Registered Marketers</div>
                        <div className="text-2xl font-black font-mono text-indigo-900 mt-0.5">
                          {reportData.kpis?.[0]?.value || '0'}
                        </div>
                      </div>
                      <div className="bg-brand-light border border-brand-border p-3 rounded-xl">
                        <div className="text-[10px] font-bold text-brand uppercase">Referred Customers</div>
                        <div className="text-2xl font-black font-mono text-brand mt-0.5">
                          {reportData.kpis?.[1]?.value || '0'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* View Selector for Sales Tab */}
              {activeTab === 'sales' && (
                <div className="flex items-center justify-between bg-white border border-slate-200/90 p-1.5 rounded-xl">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSalesView('orders')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        salesView === 'orders' 
                          ? 'bg-brand text-white shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Package size={13} /> Orders & Sales Billed ({reportData.table?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalesView('inflows')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        salesView === 'inflows' 
                          ? 'bg-brand text-white shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Receipt size={13} /> Collections & Inflows Ledger ({reportData.secondaryBreakdown?.inflowLedger?.length || 0})
                    </button>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold pr-2 hidden sm:inline">
                    {salesView === 'inflows' ? 'Itemized Rupee-by-Rupee Ledger' : 'Standard Delivery & Spot Invoices'}
                  </span>
                </div>
              )}

              {/* Data Table */}
              <div className="table-container shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {displayTable.length > 0 ? (
                          Object.keys(displayTable[0]).map(key => (
                            <th key={key} className="table-th font-bold text-slate-700 whitespace-nowrap">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </th>
                          ))
                        ) : (
                          <th className="table-th">Data</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {displayTable.length > 0 ? (
                        pagination.paginatedItems.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            {Object.entries(row).map(([k, val], cellIdx) => {
                              const isNumeric = typeof val === 'number';
                              const isChannel = k === 'Payment Channel';
                              return (
                                <td 
                                  key={cellIdx} 
                                  className={`table-td whitespace-nowrap text-xs ${
                                    isNumeric && (k.includes('(Rs)') || k.includes('Sold') || k.includes('Qty') || k.includes('Count')) 
                                      ? 'text-right font-bold text-slate-800 font-mono' 
                                      : 'text-left'
                                  }`}
                                >
                                  {isChannel ? (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getChannelBadge(val)}`}>
                                      {val}
                                    </span>
                                  ) : isNumeric ? (
                                    val.toLocaleString()
                                  ) : (
                                    val || '—'
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="100%" className="p-10 text-center text-slate-400 text-xs">
                            No records found for the selected period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {/* STICKY TOTALS FOOTER */}
                    {displayTable.length > 0 && (
                      <tfoot className="bg-slate-900 text-white font-mono font-bold text-xs border-t-2 border-slate-800">
                        <tr>
                          {salesView === 'inflows' && activeTab === 'sales' ? (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap">TOTALS</td>
                              <td className="px-4 py-3 whitespace-nowrap">{displayTable.length} Receipts</td>
                              <td className="px-4 py-3 whitespace-nowrap">—</td>
                              <td className="px-4 py-3 whitespace-nowrap">—</td>
                              <td className="px-4 py-3 whitespace-nowrap">—</td>
                              <td className="px-4 py-3 whitespace-nowrap">—</td>
                              <td className="px-4 py-3 whitespace-nowrap text-right font-extrabold text-emerald-400">
                                Rs. {displayTable.reduce((sum, r) => sum + Number(r['Amount Collected (Rs)'] || 0), 0).toLocaleString()}
                              </td>
                            </>
                          ) : reportData.summaryRow ? (
                            Object.keys(displayTable[0]).map((key, fIdx) => {
                              const val = reportData.summaryRow[key];
                              const isNumeric = typeof val === 'number';
                              return (
                                <td 
                                  key={fIdx} 
                                  className={`px-4 py-3 whitespace-nowrap ${isNumeric ? 'text-right' : 'text-left'}`}
                                >
                                  {isNumeric ? `Rs. ${val.toLocaleString()}` : (val || '—')}
                                </td>
                              );
                            })
                          ) : null}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <TablePagination pagination={pagination} />
              </div>
            </>
          ) : (
            <div className="card-surface p-12 text-center text-slate-400 text-sm">
              Select a report type and period to view data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

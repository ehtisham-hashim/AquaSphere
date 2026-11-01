import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_URL } from '../utils/api';
import { useTenant } from '../context/TenantContext';
import { useLiveEvent } from '../context/SSEContext';
import { 
  Download, Calendar, TrendingUp, DollarSign, 
  Package, Settings, Users, Truck, AlertCircle, Printer,
  CreditCard, Layers, Award
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend 
} from 'recharts';
import { PageHeader } from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/common/TablePagination';

const ALL_REPORT_TABS = [
  { id: 'sales', label: 'Sales & Channels', icon: TrendingUp },
  { id: 'marketers', label: 'Marketer Commissions', icon: Award },
  { id: 'credit', label: 'Customer Credit (Udhaar)', icon: Users },
  { id: 'profitability', label: 'Profitability (P&L)', icon: DollarSign },
  { id: 'production', label: 'Production & Scrap', icon: Settings },
  { id: 'expenses', label: 'Operating Expenses', icon: AlertCircle },
  { id: 'inventory', label: 'Inventory Health', icon: Package },
  { id: 'vendor', label: 'Vendor Payables', icon: Truck },
  { id: 'fleet', label: '19L Bottle Fleet', icon: Package, aquasphereOnly: true }
];

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' }
];

export default function Reports() {
  const { tenant, isWadaana } = useTenant();
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productFilter, setProductFilter] = useState('ALL');
  const [finishedGoods, setFinishedGoods] = useState([]);
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Available tabs respecting tenant
  const availableTabs = useMemo(() => {
    return ALL_REPORT_TABS.filter(t => !t.aquasphereOnly || !isWadaana);
  }, [isWadaana]);

  // Load active finished goods for dropdown filter
  useEffect(() => {
    let isMounted = true;
    const loadItems = async () => {
      try {
        const res = await fetch(`${API_URL}/items?type=FINISHED_GOOD`, {
          headers: { 'x-tenant': tenant },
          credentials: 'include'
        });
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setFinishedGoods(json.data.filter(i => !i.archivedAt));
        }
      } catch (err) {
        console.error('Failed to load finished goods for report filters:', err);
      }
    };
    loadItems();
    return () => { isMounted = false; };
  }, [tenant]);

  // Client-side product filter for the table if productFilter !== 'ALL'
  const filteredTable = useMemo(() => {
    if (!reportData?.table || !Array.isArray(reportData.table)) return [];
    if (productFilter === 'ALL' || activeTab !== 'sales') return reportData.table;
    const target = productFilter.toLowerCase();
    return reportData.table.filter(row => {
      const itemsCol = (row['Items'] || '').toLowerCase();
      return itemsCol.includes(target);
    });
  }, [reportData, productFilter, activeTab]);

  const pagination = usePagination(filteredTable, 50, `${activeTab}_${period}_${selectedMonth}_${productFilter}`);

  const fetchReport = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      let url = `${API_URL}/reports/${activeTab}?period=${period}`;
      if (period === 'monthly') {
        url += `&month=${selectedMonth}`;
      } else if (period === 'custom') {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
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
  }, [activeTab, period, selectedMonth, startDate, endDate, tenant]);

  const fetchData = fetchReport;
  useLiveEvent(['ORDER_UPDATED', 'INVENTORY_CHANGED', 'PRODUCTION_UPDATED', 'DAILY_CLOSE_CHANGED'], () => fetchData(true));

  useEffect(() => {
    if (period === 'custom' && !startDate && !endDate) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (period !== 'custom') {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, period, selectedMonth]);

  useEffect(() => {
    if (period === 'custom' && startDate && endDate) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleExportCSV = () => {
    if (!filteredTable || filteredTable.length === 0) return;
    
    const headers = Object.keys(filteredTable[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of filteredTable) {
      const values = headers.map(header => {
        const val = row[header];
        const str = String(val === undefined || val === null ? '' : val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(values.join(','));
    }

    if (reportData?.summaryRow) {
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
    a.setAttribute('download', `${activeTab}_report_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Payment method total calculation for percentages
  const paymentTotals = useMemo(() => {
    if (!reportData?.secondaryBreakdown?.byPaymentMethod) return { total: 0, items: [] };
    const raw = reportData.secondaryBreakdown.byPaymentMethod;
    const total = Object.values(raw).reduce((sum, v) => sum + Number(v || 0), 0);
    const items = Object.entries(raw).map(([method, amount]) => ({
      method,
      amount: Number(amount || 0),
      percent: total > 0 ? Math.round((Number(amount || 0) / total) * 100) : 0
    })).filter(i => i.amount > 0 || ['CASH', 'BANK_TRANSFER'].includes(i.method));
    return { total, items };
  }, [reportData]);

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <PageHeader
        title="Reports & Analytics Suite"
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Period Segmented Filter */}
            <div className="flex bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80">
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    period === p.id ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Month Picker */}
            {period === 'monthly' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 shadow-2xs">
                <Calendar size={13} className="text-slate-400" />
                <input
                  type="month"
                  className="text-xs border-none outline-none text-slate-700 bg-transparent font-medium cursor-pointer"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                />
              </div>
            )}

            {/* Custom Date Range */}
            {period === 'custom' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 shadow-2xs">
                <Calendar size={13} className="text-slate-400" />
                <input type="date" className="text-xs border-none outline-none text-slate-700 bg-transparent font-medium" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-300">-</span>
                <input type="date" className="text-xs border-none outline-none text-slate-700 bg-transparent font-medium" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}

            {/* Dynamic Product Filter (on Sales tab) */}
            {activeTab === 'sales' && finishedGoods.length > 0 && (
              <select
                aria-label="Filter by Catalog Product"
                value={productFilter}
                onChange={e => setProductFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-brand shadow-2xs cursor-pointer"
              >
                <option value="ALL">All Products</option>
                {finishedGoods.map(fg => (
                  <option key={fg.id} value={fg.name}>
                    {fg.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => window.print()}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
              title="Print A4 Report"
            >
              <Printer size={13} /> Print A4
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!filteredTable || filteredTable.length === 0}
              className="btn-primary"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar Tabs */}
        <div className="lg:w-60 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
          {availableTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setProductFilter('ALL');
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left shrink-0 ${
                  isActive 
                    ? 'bg-slate-900 text-white font-bold shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-100'
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
              <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
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
                        <TrendingUp size={14} className="text-indigo-600" />
                        {activeTab === 'sales' ? 'Daily Billed vs. Cash Trend' :
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
                            <Bar dataKey="Billed" fill="#0284c7" radius={[4, 4, 0, 0]} name="Billed (Rs)" />
                            <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} name="Cash Collected (Rs)" />
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
                            <Bar dataKey="CashCollected" fill="#10b981" radius={[4, 4, 0, 0]} name="Cash Collected" />
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
                            <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} name="Amount" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Right Card: Secondary Breakdowns */}
                {activeTab === 'sales' && (
                  <div className="space-y-4">
                    {/* Payment Channel Card */}
                    <div className="card-surface p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CreditCard size={14} className="text-emerald-600" />
                          Cash Collected by Channel
                        </h4>
                        <span className="font-mono text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Rs. {paymentTotals.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {paymentTotals.items.map(ch => (
                          <div key={ch.method} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium text-slate-700">
                              <span>{ch.method.replace('_', ' ')}</span>
                              <span className="font-mono font-bold">Rs. {ch.amount.toLocaleString()} ({ch.percent}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${ch.percent}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Finished Goods Volume Card (100% Dynamic) */}
                    <div className="card-surface p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={14} className="text-indigo-600" />
                          Sales by Finished Good (Dynamic)
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Catalog Sync</span>
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
                              <div className="text-[10px] text-indigo-600 font-bold">Rs. {p.billedRevenue.toLocaleString()}</div>
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
                      All customers assigned with <span className="font-mono font-bold text-slate-800">MKT-xx</span> badges are tracked here with full dual identification (<span className="font-mono text-slate-800">JAM313xxxx • MKT-xx</span>).
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                        <div className="text-[10px] font-bold text-indigo-700 uppercase">Registered Marketers</div>
                        <div className="text-2xl font-black font-mono text-indigo-900 mt-0.5">
                          {reportData.kpis?.[0]?.value || '0'}
                        </div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                        <div className="text-[10px] font-bold text-emerald-700 uppercase">Referred Customers</div>
                        <div className="text-2xl font-black font-mono text-emerald-900 mt-0.5">
                          {reportData.kpis?.[1]?.value || '0'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Table */}
              <div className="table-container shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {filteredTable.length > 0 ? (
                          Object.keys(filteredTable[0]).map(key => (
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
                      {filteredTable.length > 0 ? (
                        pagination.paginatedItems.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            {Object.entries(row).map(([k, val], cellIdx) => {
                              const isNumeric = typeof val === 'number';
                              return (
                                <td 
                                  key={cellIdx} 
                                  className={`table-td whitespace-nowrap font-mono text-xs ${
                                    isNumeric && (k.includes('(Rs)') || k.includes('Sold') || k.includes('Qty') || k.includes('Count')) 
                                      ? 'text-right font-bold text-slate-800' 
                                      : 'text-left'
                                  }`}
                                >
                                  {isNumeric ? val.toLocaleString() : (val || '—')}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="100%" className="p-10 text-center text-slate-400 text-xs">
                            No records found for the selected period and product filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {/* STICKY TOTALS FOOTER */}
                    {reportData.summaryRow && filteredTable.length > 0 && (
                      <tfoot className="bg-slate-900 text-white font-mono font-bold text-xs border-t-2 border-slate-800">
                        <tr>
                          {Object.keys(filteredTable[0]).map((key, fIdx) => {
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
                          })}
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

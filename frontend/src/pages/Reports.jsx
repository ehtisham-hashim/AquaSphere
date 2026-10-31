import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_URL } from '../utils/api';
import { useTenant } from '../context/TenantContext';
import { useLiveEvent } from '../context/SSEContext';
import { 
  Download, Calendar, TrendingUp, DollarSign, 
  Package, Settings, Users, Truck, AlertCircle, Printer 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PageHeader } from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/common/TablePagination';

const REPORT_TABS = [
  { id: 'sales', label: 'Sales Report', icon: TrendingUp },
  { id: 'profitability', label: 'Profitability & COGS', icon: DollarSign },
  { id: 'expenses', label: 'Operating Expenses', icon: AlertCircle },
  { id: 'inventory', label: 'Inventory Movements', icon: Package },
  { id: 'production', label: 'Production Efficiency', icon: Settings },
  { id: 'credit', label: 'Customer Credits', icon: Users },
  { id: 'vendor', label: 'Vendor Payables', icon: Truck },
  { id: 'fleet', label: '19L Bottle Fleet', icon: Package }
];

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' }
];

export default function Reports() {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pagination = usePagination(reportData?.table || [], 50, `${activeTab}_${period}_${selectedMonth}`);

  const chartData = useMemo(() => {
    if (!reportData || !reportData.table || reportData.table.length === 0) return [];
    if (activeTab === 'profitability') {
      return reportData.table
        .filter(r => r['Financial Metric'] && typeof r['Amount (Rs)'] === 'number')
        .map(r => ({ name: r['Financial Metric'].replace('Collected', '').trim(), value: r['Amount (Rs)'] }));
    }
    if (activeTab === 'expenses') {
      const catMap = {};
      reportData.table.forEach(r => {
        const cat = r['Category'] || 'Other';
        catMap[cat] = (catMap[cat] || 0) + Number(r['Amount (Rs)'] || 0);
      });
      return Object.entries(catMap).map(([name, value]) => ({ name, value }));
    }
    if (activeTab === 'credit') {
      return reportData.table
        .slice(0, 8)
        .map(r => ({ name: r['Customer Name'], value: Number(r['Outstanding Debt (Rs)'] || 0) }));
    }
    if (activeTab === 'sales') {
      const itemMap = {};
      reportData.table.forEach(r => {
        const item = r['Item'] || r['Category Type'] || 'Order';
        itemMap[item] = (itemMap[item] || 0) + Number(r['Cash Collected (Rs)'] || 0);
      });
      return Object.entries(itemMap).map(([name, value]) => ({ name, value }));
    }
    if (activeTab === 'production') {
      return reportData.table.slice(0, 8).map(r => ({
        name: r['Batch ID'],
        value: Number(r['Good Yield (Packs)'] || 0)
      }));
    }
    return [];
  }, [reportData, activeTab]);

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
  useLiveEvent(['ORDER_UPDATED', 'INVENTORY_CHANGED', 'PRODUCTION_UPDATED'], () => fetchData(true));

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
    if (!reportData || !reportData.table || reportData.table.length === 0) return;
    
    const headers = Object.keys(reportData.table[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of reportData.table) {
      const values = headers.map(header => {
        const val = row[header];
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${activeTab}_report_${period}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <PageHeader
        title="Reports & Analytics"
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

            {period === 'custom' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 shadow-2xs">
                <Calendar size={13} className="text-slate-400" />
                <input type="date" className="text-xs border-none outline-none text-slate-700 bg-transparent font-medium" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-300">-</span>
                <input type="date" className="text-xs border-none outline-none text-slate-700 bg-transparent font-medium" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
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
              disabled={!reportData || !reportData.table || reportData.table.length === 0}
              className="btn-primary"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 shrink-0 flex flex-row lg:flex-col gap-0.5 overflow-x-auto pb-1 lg:pb-0">
          {REPORT_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left shrink-0 ${
                  isActive 
                    ? 'bg-brand/10 text-brand font-semibold shadow-2xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-brand' : 'text-slate-400'} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Report Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {loading ? (
            <div className="card-surface p-12 text-center text-slate-400 text-sm">
              Generating report...
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

              {/* Visual Analytics Chart */}
              {chartData && chartData.length > 0 && (
                <div className="card-surface p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {activeTab === 'sales' ? 'Sales Revenue Trend' :
                       activeTab === 'profitability' ? 'Income & Expense Breakdown' :
                       activeTab === 'expenses' ? 'Expenses by Category' :
                       activeTab === 'credit' ? 'Top Debtors Exposure' :
                       activeTab === 'production' ? 'Production Yield by Batch' :
                       'Overview Analytics'}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">Visual Overview</span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" height={40} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip 
                          formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`, 'Amount']}
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="value" fill="#0284c7" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="table-container">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead>
                      <tr>
                        {reportData.table && reportData.table.length > 0 ? (
                          Object.keys(reportData.table[0]).map(key => (
                            <th key={key} className="table-th">{key.replace(/([A-Z])/g, ' $1').trim()}</th>
                          ))
                        ) : (
                          <th className="table-th">Data</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.table && reportData.table.length > 0 ? (
                        pagination.paginatedItems.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            {Object.values(row).map((val, cellIdx) => (
                              <td key={cellIdx} className="table-td whitespace-nowrap font-mono text-xs">
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="100%" className="p-10 text-center text-slate-400 text-sm">
                            No data available for the selected period.
                          </td>
                        </tr>
                      )}
                    </tbody>
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

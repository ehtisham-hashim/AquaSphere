import { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
import { useTenant } from '../context/TenantContext';
import { 
  BarChart2, Download, Calendar, TrendingUp, DollarSign, 
  Package, Settings, Users, Truck, AlertCircle 
} from 'lucide-react';

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
  const { isWadaana } = useTenant();
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_URL}/reports/${activeTab}?period=${period}`;
      if (period === 'custom') {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        setReportData(data.data);
      } else {
        setError(data.message || 'Failed to load report data');
        setReportData(null);
      }
    } catch (err) {
      setError('Network error loading report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period === 'custom' && !startDate && !endDate) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (period !== 'custom') {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, period]);

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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">
              {isWadaana ? 'WADAANA' : 'AQUASPHERE'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight mt-1">
            <BarChart2 className="text-brand-primary" size={22} /> Advanced Reports
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">Analytics and data exports for business operations</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Period Segmented Filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  period === p.id ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-xs">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" className="text-xs border-none outline-none text-slate-700 bg-transparent font-medium" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-slate-300">-</span>
              <input type="date" className="text-xs border-none outline-none text-slate-700 bg-transparent font-medium" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}

          <button
            onClick={handleExportCSV}
            disabled={!reportData || !reportData.table || reportData.table.length === 0}
            className="btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 disabled:opacity-50"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar Tabs */}
        <div className="lg:w-60 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
          {REPORT_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left shrink-0 ${
                  isActive 
                    ? 'bg-brand-light text-brand-primary border border-brand-light shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-brand-primary' : 'text-slate-400'} />
                {tab.label}
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
                        reportData.table.map((row, idx) => (
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

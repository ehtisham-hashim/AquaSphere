import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  const { user } = useAuth();
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
      let url = `${import.meta.env.VITE_API_URL}/reports/${activeTab}?period=${period}`;
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
    // Set default dates if custom
    if (period === 'custom' && !startDate && !endDate) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (period !== 'custom') {
      fetchReport();
    }
  }, [activeTab, period]);

  // fetch when custom dates change
  useEffect(() => {
    if (period === 'custom' && startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.table || reportData.table.length === 0) return;
    
    const headers = Object.keys(reportData.table[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of reportData.table) {
      const values = headers.map(header => {
        const val = row[header];
        // escape quotes and wrap in quotes if contains comma
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
    <div className="space-y-6 p-2 max-w-[98%] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
            <BarChart2 className="text-sky-500" /> Advanced Reports
          </h1>
          <p className="text-slate-500 text-sm mt-1">Analytics and data exports for business operations.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <Calendar size={16} className="text-slate-400" />
              <input type="date" className="text-sm border-none outline-none text-slate-700 bg-transparent" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-slate-300">-</span>
              <input type="date" className="text-sm border-none outline-none text-slate-700 bg-transparent" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}

          <button
            onClick={handleExportCSV}
            disabled={!reportData || !reportData.table || reportData.table.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-1">
          {REPORT_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive ? 'bg-sky-50 text-sky-700 border border-sky-100 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-sky-500' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Report Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
              Generating report...
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-rose-600 flex items-center gap-3">
              <AlertCircle />
              <p className="font-medium">{error}</p>
            </div>
          ) : reportData ? (
            <>
              {/* KPI Cards */}
              {reportData.kpis && reportData.kpis.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {reportData.kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{kpi.label}</h4>
                      <p className="text-2xl font-black text-slate-800">{kpi.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Data Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        {reportData.table && reportData.table.length > 0 ? (
                          Object.keys(reportData.table[0]).map(key => (
                            <th key={key} className="px-6 py-4">{key.replace(/([A-Z])/g, ' $1').trim()}</th>
                          ))
                        ) : (
                          <th className="px-6 py-4">Data</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.table && reportData.table.length > 0 ? (
                        reportData.table.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {Object.values(row).map((val, cellIdx) => (
                              <td key={cellIdx} className="px-6 py-3 whitespace-nowrap">
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="100%" className="px-6 py-8 text-center text-slate-500">
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
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
              Select a report type and period to view data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { 
  ExpensesHeader, 
  ExpensesSummaryCards, 
  ExpensesTable, 
  LogExpenseModal 
} from '../components/expenses';
import { useTenant } from '../context/TenantContext';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLiveEvent } from '../context/SSEContext';

const PurchasesPage = lazy(() => import('./Purchases'));

const API = API_URL;

const TABS = [
  { key: 'general', label: 'General Operational Expenses' },
  { key: 'rawmaterial', label: 'Raw Material Purchases & Expenses' },
];

export default function Expenses() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState('general');

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [timeRange, setTimeRange] = useState('MONTHLY');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  const fetchExpenses = useCallback(async (isBackground = false) => {
    if (!isBackground && !hasLoadedRef.current) setLoading(true);
    try {
      const res = await fetch(`${API}/expenses`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) setExpenses(json.data || []);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      hasLoadedRef.current = true;
      if (!isBackground) setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useLiveEvent('EXPENSE_LOGGED', () => fetchExpenses(true));

  const filteredExpenses = useMemo(() => {
    return expenses.filter(ex => {
      const matchesCategory = selectedCategory === 'ALL' || ex.category === selectedCategory;
      const matchesSearch = ex.category.toLowerCase().includes(search.toLowerCase()) ||
        (ex.remarks && ex.remarks.toLowerCase().includes(search.toLowerCase()));

      const exDate = new Date(ex.createdAt);
      const now = new Date();
      
      const matchesTime = timeRange === 'DAILY' ? exDate.toDateString() === now.toDateString()
        : timeRange === 'WEEKLY' ? exDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        : timeRange === 'MONTHLY' ? exDate >= new Date(now.getFullYear(), now.getMonth(), 1)
        : timeRange === 'QUARTERLY' ? exDate >= new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        : timeRange === 'YEARLY' ? exDate >= new Date(now.getFullYear(), 0, 1)
        : true;

      return matchesCategory && matchesSearch && matchesTime;
    });
  }, [expenses, selectedCategory, search, timeRange]);

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

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-800 border border-b-white dark:border-gray-700 dark:border-b-gray-800 text-blue-600 dark:text-blue-400 -mb-px'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <>
          <ExpensesHeader 
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            onExportCSV={handleExportCSV}
            onOpenModal={() => setIsModalOpen(true)}
            hasExpenses={filteredExpenses.length > 0}
            tenant={tenant}
          />

          <ExpensesSummaryCards 
            expenses={expenses}
            filteredExpenses={filteredExpenses}
            timeRange={timeRange}
          />

          <ExpensesTable 
            filteredExpenses={filteredExpenses}
            loading={loading}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            search={search}
            setSearch={setSearch}
            userName={user?.name}
          />

          <LogExpenseModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSaved={() => {
              setIsModalOpen(false);
              fetchExpenses();
            }}
            tenant={tenant}
          />
        </>
      )}

      {activeTab === 'rawmaterial' && (
        <Suspense fallback={<div className="py-12 text-center text-gray-500 text-sm">Loading purchases...</div>}>
          <PurchasesPage />
        </Suspense>
      )}
    </div>
  );
}

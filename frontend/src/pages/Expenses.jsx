import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ExpensesHeader, 
  ExpensesSummaryCards, 
  ExpensesTable, 
  LogExpenseModal 
} from '../components/expenses';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const API = API_URL;

export default function Expenses() {
  const { user } = useAuth();
  const tenant = getCompanyFromCookie();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [timeRange, setTimeRange] = useState('MONTHLY');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(ex => {
      const matchesCategory = selectedCategory === 'ALL' || ex.category === selectedCategory;
      const matchesSearch = ex.category.toLowerCase().includes(search.toLowerCase()) ||
        (ex.remarks && ex.remarks.toLowerCase().includes(search.toLowerCase()));

      const exDate = new Date(ex.createdAt);
      const now = new Date();
      
      let matchesTime = true;
      if (timeRange === 'DAILY') {
        matchesTime = exDate.toDateString() === now.toDateString();
      } else if (timeRange === 'WEEKLY') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        matchesTime = exDate >= startOfWeek;
      } else if (timeRange === 'MONTHLY') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        matchesTime = exDate >= startOfMonth;
      } else if (timeRange === 'QUARTERLY') {
        const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
        const startOfQuarter = new Date(now.getFullYear(), currentQuarterMonth, 1);
        matchesTime = exDate >= startOfQuarter;
      } else if (timeRange === 'YEARLY') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        matchesTime = exDate >= startOfYear;
      } else if (timeRange === 'LIFETIME') {
        matchesTime = true;
      }

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
        totalExpensesCount={expenses.length}
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
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ExpensesHeader, 
  ExpensesSummaryCards, 
  ExpensesTable, 
  LogExpenseModal 
} from '../components/expenses';
import { DeleteConfirmationModal } from '../components/ui';
import { toast } from 'sonner';
import { useTenant } from '../context/TenantContext';
import { API_URL } from '../utils/api';
import { peekCachedData } from '../utils/apiCache';
import { useAuth } from '../context/AuthContext';
import { useLiveEvent } from '../context/SSEContext';

const EXPENSES_ENDPOINT = `${API_URL}/expenses?limit=500`;

export default function Expenses() {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [expenses, setExpenses] = useState(() => {
    const cached = peekCachedData(EXPENSES_ENDPOINT, { headers: { 'x-tenant': tenant } });
    return (cached?.success && Array.isArray(cached.data)) ? cached.data : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = peekCachedData(EXPENSES_ENDPOINT, { headers: { 'x-tenant': tenant } });
    return !(cached?.success && Array.isArray(cached.data) && cached.data.length > 0);
  });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [timeRange, setTimeRange] = useState('MONTHLY');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasLoadedRef = useRef(Boolean(expenses && expenses.length > 0));

  const canDeleteExpense = user?.role === 'OWNER' || user?.role === 'ACCOUNTANT' || user?.role === 'TRANSPORT_MANAGER';

  const fetchExpenses = useCallback(async (isBackground = false) => {
    if (!isBackground && !hasLoadedRef.current) setLoading(true);
    try {
      const res = await fetch(EXPENSES_ENDPOINT, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setExpenses(json.data);
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
  useLiveEvent('PURCHASE_CREATED', () => fetchExpenses(true));

  const filteredExpenses = useMemo(() => {
    return expenses.filter(ex => {
      const categoryStr = String(ex?.category || ex?.type || 'MISC');
      const matchesCategory = selectedCategory === 'ALL' || categoryStr === selectedCategory;
      const q = search.toLowerCase();
      const matchesSearch = categoryStr.toLowerCase().includes(q) ||
        (ex?.remarks && String(ex.remarks).toLowerCase().includes(q)) ||
        (ex?.vendorName && String(ex.vendorName).toLowerCase().includes(q));

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
    const rows = filteredExpenses.map(ex => {
      const categoryStr = String(ex?.category || ex?.type || 'MISC');
      return [
        new Date(ex.createdAt).toLocaleDateString(),
        `"${categoryStr.replace(/"/g, '""')}"`,
        Math.round(Number(ex.amount)),
        `"${(ex.remarks || '').replace(/"/g, '""')}"`,
        `"${ex.receiptUrl || ''}"`,
        `"${(ex.createdBy?.name || user?.name || 'System').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/expenses/${expenseToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.data?.message || 'Expense deleted successfully');
        setExpenseToDelete(null);
        fetchExpenses();
      } else {
        toast.error(data.message || 'Failed to delete expense');
      }
    } catch (err) {
      console.error('Failed to delete expense:', err);
      toast.error('Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 min-w-0 max-w-full overflow-x-hidden">
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
        onDeleteExpense={setExpenseToDelete}
        canDelete={canDeleteExpense}
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

      <DeleteConfirmationModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleConfirmDeleteExpense}
        loading={isDeleting}
        title="Delete Expense"
        message={
          expenseToDelete?.isPurchase
            ? `Are you sure you want to delete raw material purchase expense "${expenseToDelete?.remarks || 'Purchase'}"? This will reverse factory/warehouse raw material inventory and remove related vendor ledger entries.`
            : `Are you sure you want to delete this expense of Rs. ${Math.round(Number(expenseToDelete?.amount || 0)).toLocaleString()} (${expenseToDelete?.category})?`
        }
        confirmText="Delete Expense"
      />
    </div>
  );
}

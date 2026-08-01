import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  InventoryHeader, 
  FinishedGoodsSummaryCards, 
  InventoryTransactionHistoryTable,
  StockTransferModal
} from '../components/inventory';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { API_URL as API } from '../utils/api';

export default function Inventory() {
  const tenant = getCompanyFromCookie();

  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const fetchInventoryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [itemsRes, txnsRes] = await Promise.all([
        fetch(`${API}/items?type=FINISHED_GOOD`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API}/items/transactions?type=FINISHED_GOOD&limit=150`, { headers: { 'x-tenant': tenant }, credentials: 'include' })
      ]);

      const itemsJson = await itemsRes.json();
      const txnsJson = await txnsRes.json();

      if (itemsJson.success || itemsRes.ok) {
        setItems(itemsJson.data || []);
      }
      if (txnsJson.success || txnsRes.ok) {
        setTransactions(txnsJson.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch finished goods inventory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  // Filter transactions by search
  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const term = search.toLowerCase();
    return transactions.filter(t => 
      t.item?.name?.toLowerCase().includes(term) ||
      t.reason?.toLowerCase().includes(term) ||
      t.direction?.toLowerCase().includes(term) ||
      t.batchNo?.toLowerCase().includes(term) ||
      t.location?.toLowerCase().includes(term)
    );
  }, [transactions, search]);

  const totalFinishedGoodsCount = items.length;
  const totalUnitsSum = items.reduce((acc, curr) => acc + Number(curr.cachedQty || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Module 1: Inventory Header */}
      <InventoryHeader 
        search={search}
        onSearchChange={setSearch}
        tenant={tenant}
        totalFinishedGoods={totalFinishedGoodsCount}
        totalUnitsCount={totalUnitsSum}
        onOpenTransferModal={() => setIsTransferModalOpen(true)}
      />

      {/* Module 2: Finished Goods Live Summary Cards with Location Breakdown (Factory vs Warehouse) */}
      <FinishedGoodsSummaryCards 
        items={items}
        tenant={tenant}
      />

      {/* Module 4: Audit Ledger & Transaction History Table */}
      <InventoryTransactionHistoryTable 
        transactions={filteredTransactions}
        isLoading={isLoading}
        tenant={tenant}
      />

      {/* Stock Transfer Modal (Factory <-> Warehouse) */}
      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        items={items}
        tenant={tenant}
        onSuccess={fetchInventoryData}
      />
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  InventoryHeader, 
  FinishedGoodsSummaryCards, 
  InventoryTransactionHistoryTable,
  StockTransferModal
} from '../components/inventory';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { API_URL as API } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Inventory() {
  const { user } = useAuth();
  const tenant = getCompanyFromCookie();

  const canTransferStock = user?.role === 'OWNER' || user?.role === 'PRODUCTION_MANAGER';

  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const fetchInventoryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const promises = [
        fetch(`${API}/items?type=FINISHED_GOOD`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API}/items/transactions?type=FINISHED_GOOD&limit=150`, { headers: { 'x-tenant': tenant }, credentials: 'include' })
      ];

      const results = await Promise.all(promises);
      const itemsJson = await results[0].json();
      const txnsJson = await results[1].json();

      if (itemsJson.success || results[0].ok) {
        setItems(itemsJson.data || []);
      }
      if (txnsJson.success || results[1].ok) {
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

  const negativeStockItems = items.filter(i => Number(i.cachedQty || 0) < 0);
  const hasNegativeStock = negativeStockItems.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Module 1: Inventory Header */}
      <InventoryHeader 
        search={search}
        onSearchChange={setSearch}
        tenant={tenant}
        onOpenTransferModal={canTransferStock ? () => setIsTransferModalOpen(true) : null}
      />

      {/* Negative Stock Warning Banner */}
      {hasNegativeStock && (
        <div className="bg-red-50 border-2 border-red-400 rounded-xl p-5 flex items-start gap-4 shadow-lg animate-pulse">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xl font-black">!</span>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-black text-red-900 mb-1.5 flex items-center gap-2">
              ❌ Inventory Error: Negative Stock Detected
            </h3>
            <p className="text-sm text-red-800 font-semibold mb-2">
              Critical system integrity issue — {negativeStockItems.length} item{negativeStockItems.length > 1 ? 's have' : ' has'} negative stock levels. This should never happen and indicates a data consistency problem.
            </p>
            <div className="bg-white/80 border border-red-200 rounded-lg p-3 space-y-1.5">
              {negativeStockItems.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-red-950">{item.name}</span>
                  <span className="font-black text-red-700 bg-red-100 px-2 py-0.5 rounded">
                    {Number(item.cachedQty).toFixed(2)} units
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-red-700 font-semibold mt-3">
              ⚠️ Action required: Contact system administrator immediately to reconcile inventory records.
            </p>
          </div>
        </div>
      )}

      {/* Module 2: Finished Goods Live Summary Cards with Location Breakdown (Factory vs Warehouse) & 19L Bottle Custody */}
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

      {/* Stock Transfer Modal (Factory <-> Warehouse) - Disabled for Accountant */}
      {canTransferStock && (
        <StockTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          items={items}
          tenant={tenant}
          onSuccess={fetchInventoryData}
        />
      )}
    </div>
  );
}

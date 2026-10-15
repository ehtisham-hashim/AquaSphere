import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  InventoryHeader, 
  FinishedGoodsSummaryCards, 
  InventoryTransactionHistoryTable,
  StockTransferModal,
  AddEditFinishedGoodModal
} from '../components/inventory';
import { useTenant } from '../context/TenantContext';
import { API_URL as API } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLiveEvent } from '../context/SSEContext';
import { DeleteConfirmationModal } from '../components/ui';

export default function Inventory() {
  const { user } = useAuth();
  const { tenant, isWadaana } = useTenant();
  const isOwner = user?.role === 'OWNER';

  const canTransferStock = isOwner || user?.role === 'PRODUCTION_MANAGER';
  const canAddFinishedGood = isOwner || user?.role === 'ADMIN';

  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [selectedMovement, setSelectedMovement] = useState('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState('ALL');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const hasLoadedRef = useRef(false);

  const fetchInventoryData = useCallback(async (isBackground = false) => {
    if (!isBackground && !hasLoadedRef.current) {
      setIsLoading(true);
    }
    try {
      const promises = [
        fetch(`${API}/items?type=FINISHED_GOOD`, { 
          headers: { 'x-tenant': tenant }, 
          credentials: 'include' 
        }),
        fetch(`${API}/items/transactions?type=FINISHED_GOOD&limit=300`, { 
          headers: { 'x-tenant': tenant }, 
          credentials: 'include' 
        })
      ];

      const results = await Promise.all(promises);
      const itemsJson = await results[0].json();
      const txnsJson = await results[1].json();

      if (itemsJson.success || results[0].ok) {
        setItems(itemsJson.data || []);
      } else {
        toast.error(itemsJson.message || 'Failed to load inventory items');
      }
      if (txnsJson.success || results[1].ok) {
        setTransactions(txnsJson.data || []);
      } else {
        toast.error(txnsJson.message || 'Failed to load inventory transactions');
      }
    } catch (err) {
      console.error('Failed to fetch finished goods inventory:', err);
      toast.error('Failed to load inventory');
    } finally {
      hasLoadedRef.current = true;
      if (!isBackground) setIsLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  useLiveEvent(['INVENTORY_CHANGED', 'PRODUCTION_UPDATED', 'PURCHASE_CREATED', 'COUNTER_SALE_CREATED'], () => fetchInventoryData(true));

  // Filter and sort transactions by selected product, movement, and timeframe
  const filteredTransactions = useMemo(() => {
    let list = transactions;

    // 1. Product Filter
    if (selectedProduct && selectedProduct !== 'ALL') {
      list = list.filter(t => t.itemId === selectedProduct || t.item?.id === selectedProduct);
    }

    // 2. Movement Filter (Inbound / Outbound)
    if (selectedMovement === 'IN') {
      list = list.filter(t => t.direction === 'IN');
    } else if (selectedMovement === 'OUT') {
      list = list.filter(t => t.direction === 'OUT');
    }

    // 3. Timeframe Filter
    if (selectedTimeframe && selectedTimeframe !== 'ALL') {
      const now = new Date();
      const startOfDay = (offset = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 0, 0, 0, 0);
      const endOfDay = (offset = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 23, 59, 59, 999);

      list = list.filter(t => {
        const d = new Date(t.createdAt || t.date);
        if (isNaN(d.getTime())) return true;

        if (selectedTimeframe === 'TODAY') {
          return d >= startOfDay(0) && d <= endOfDay(0);
        } else if (selectedTimeframe === 'YESTERDAY') {
          return d >= startOfDay(1) && d <= endOfDay(1);
        } else if (selectedTimeframe === 'LAST_3_DAYS') {
          return d >= startOfDay(2) && d <= endOfDay(0);
        } else if (selectedTimeframe === '1_WEEK') {
          return d >= startOfDay(6) && d <= endOfDay(0);
        } else if (selectedTimeframe === '1_MONTH') {
          return d >= startOfDay(30) && d <= endOfDay(0);
        } else if (selectedTimeframe === '1_YEAR') {
          return d >= startOfDay(365) && d <= endOfDay(0);
        }
        return true;
      });
    }

    // 4. Inbound / Outbound to Top Sorting
    if (selectedMovement === 'IN_FIRST') {
      return [...list].sort((a, b) => (b.direction === 'IN' ? 1 : 0) - (a.direction === 'IN' ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (selectedMovement === 'OUT_FIRST') {
      return [...list].sort((a, b) => (b.direction === 'OUT' ? 1 : 0) - (a.direction === 'OUT' ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  }, [transactions, selectedProduct, selectedMovement, selectedTimeframe]);

  const negativeStockItems = items.filter(i => Number(i.cachedQty || 0) < 0);
  const hasNegativeStock = negativeStockItems.length > 0;

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`${API}/items/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Finished good "${itemToDelete.name}" permanently deleted`);
        fetchInventoryData();
        setItemToDelete(null);
      } else {
        toast.error(json.message || 'Failed to delete item');
      }
    } catch (_err) {
      toast.error('Error deleting item');
    }
  };

  return (
    <div className="space-y-4">
      {/* Module 1: Inventory Header */}
      <InventoryHeader 
        tenant={tenant}
        onOpenTransferModal={canTransferStock ? () => setIsTransferModalOpen(true) : null}
        onOpenAddModal={canAddFinishedGood ? () => setIsAddModalOpen(true) : null}
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
        onEditItem={canAddFinishedGood ? (item) => {
          setItemToEdit(item);
          setIsAddModalOpen(true);
        } : null}
        onDeleteItem={isOwner ? setItemToDelete : null}
      />

      {/* Module 4: Audit Ledger & Transaction History Table */}
      <InventoryTransactionHistoryTable 
        transactions={filteredTransactions}
        isLoading={isLoading}
        items={items}
        selectedItemId={selectedProduct}
        onSelectItemId={setSelectedProduct}
        selectedMovement={selectedMovement}
        onSelectMovement={setSelectedMovement}
        selectedTimeframe={selectedTimeframe}
        onSelectTimeframe={setSelectedTimeframe}
        isWadaana={isWadaana}
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

      {/* Add/Edit Finished Good Modal with Recipe Builder */}
      {canAddFinishedGood && (
        <AddEditFinishedGoodModal
          isOpen={isAddModalOpen}
          itemToEdit={itemToEdit}
          onClose={() => {
            setIsAddModalOpen(false);
            setItemToEdit(null);
          }}
          onSaved={fetchInventoryData}
          tenant={tenant}
          onDeleteItem={isOwner ? setItemToDelete : null}
        />
      )}

      {/* Delete Confirmation Modal for Finished Goods */}
      <DeleteConfirmationModal
        isOpen={Boolean(itemToDelete)}
        title={`Delete Finished Good: ${itemToDelete?.name || ''}`}
        message={`Are you sure you want to permanently delete finished good "${itemToDelete?.name}"? This will remove the item, its recipe configuration, and associated inventory logs.`}
        confirmText="Delete Finished Good"
        onConfirm={handleConfirmDeleteItem}
        onClose={() => setItemToDelete(null)}
      />
    </div>
  );
}


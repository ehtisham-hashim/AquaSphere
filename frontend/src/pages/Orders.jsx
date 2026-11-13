import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Clock, UserPlus, Printer, Eye, Share2, Copy, Trash2, Package, RotateCcw, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { API_URL } from '../utils/api';
import { peekCachedData } from '../utils/apiCache';
import { getCompanyFromCookie } from '../utils/companyCookie';
import { getOrderCleanName as formatItemName } from '../constants/orders';
import { formatItemUnitTag, formatOrderItemsSummary } from '../utils/unitFormat';
import { toast } from 'sonner';
import { TableSkeleton } from '../components/common/Skeleton';
import { PageHeader, StatusBadge, TimeframeDropdown, DeleteConfirmationModal } from '../components/ui';
import MultiSelectDropdown from '../components/common/MultiSelectDropdown';
import { openWhatsAppWeb, WhatsAppTemplates } from '../utils/whatsapp';

import AddOrderModal from '../components/orders/AddOrderModal';
import EditOrderModal from '../components/orders/EditOrderModal';
import ProcessDeliveryModal from '../components/orders/ProcessDeliveryModal';
import AddCustomerModal from '../components/customer/AddCustomerModal';
import OrderInvoiceModal from '../components/orders/OrderInvoiceModal';
import RecordPaymentModal from '../components/orders/RecordPaymentModal';
import OrderSearch from '../components/orders/OrderSearch';
import OrderDetail from '../components/orders/OrderDetail';
import SettleCustomerDebtModal from '../components/customer/SettleCustomerDebtModal';
import { shareOrSendMonthlyStatementWhatsApp } from '../utils/receiptFormatter';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/common/TablePagination';
import { useLiveEvent } from '../context/SSEContext';

const DATE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Time' },
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'LAST_3_DAYS', label: 'Last 3 Days' },
  { value: '1_WEEK', label: '1 Week' },
  { value: '1_MONTH', label: '1 Month' },
  { value: '1_YEAR', label: '1 Year' },
];

const STANDARDIZED_CLIENT_OPTIONS = [
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Corporate', label: 'Corporate' },
  { value: 'Home', label: 'Home / Household' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Industrial', label: 'Industrial' }
];

const parseOrderDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match && (d.length === 10 || d.includes('T00:00:00'))) {
      const [, y, m, day] = match;
      return new Date(Number(y), Number(m) - 1, Number(day), 12, 0, 0);
    }
  }
  const dateObj = new Date(d);
  return isNaN(dateObj.getTime()) ? null : dateObj;
};

const checkDateMatch = (rawDate, filter, now) => {
  if (!rawDate || filter === 'ALL') return true;
  const d = parseOrderDate(rawDate);
  if (!d) return false;

  const startOfDay = (offset = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 0, 0, 0, 0);
  const endOfDay = (offset = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 23, 59, 59, 999);

  if (filter === 'TODAY') return d >= startOfDay(0) && d <= endOfDay(0);
  if (filter === 'YESTERDAY') return d >= startOfDay(1) && d <= endOfDay(1);
  const spanMap = { LAST_3_DAYS: 2, '1_WEEK': 7, '1_MONTH': 30, '1_YEAR': 365 };
  return spanMap[filter] ? (d >= startOfDay(spanMap[filter]) && d <= endOfDay(0)) : true;
};

const orderMatchesDate = (o, filter) => {
  if (!filter || filter === 'ALL') return true;
  const rawDate = o.expectedDelivery || o.createdAt;
  if (!rawDate) return false;
  return checkDateMatch(rawDate, filter, new Date());
};

export default function Orders() {
  const { user } = useAuth();
  const { tenant, isWadaana } = useTenant();
  const [orders, setOrders] = useState(() => {
    const cached = peekCachedData(`${API_URL}/orders`, { headers: { 'x-tenant': tenant } });
    return (cached?.success && Array.isArray(cached.data)) ? cached.data : [];
  });
  const [customers, setCustomers] = useState(() => {
    const cached = peekCachedData(`${API_URL}/customers`, { headers: { 'x-tenant': tenant } });
    return (cached?.success && Array.isArray(cached.data)) ? cached.data : [];
  });
  const [items, setItems] = useState(() => {
    const cached = peekCachedData(`${API_URL}/items`, { headers: { 'x-tenant': tenant } });
    return (cached?.success && Array.isArray(cached.data)) ? cached.data : [];
  });
  const [marketers, setMarketers] = useState(() => {
    const cached = peekCachedData(`${API_URL}/customers/marketers`, { headers: { 'x-tenant': tenant } });
    return (cached?.success && cached.data?.marketers) ? cached.data.marketers : [];
  });

  // UI State
  const [activeTab, setActiveTab] = useState('All Orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientTypes, setSelectedClientTypes] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedMarketer, setSelectedMarketer] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [statementMonth, setStatementMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [settleCustomer, setSettleCustomer] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isDeliverModalOpen, setIsDeliverModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const [isLoading, setIsLoading] = useState(() => {
    const cached = peekCachedData(`${API_URL}/orders`, { headers: { 'x-tenant': tenant } });
    return !(cached?.success && Array.isArray(cached.data));
  });
  const ordersLoadedRef = useRef(!isLoading);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground && !ordersLoadedRef.current) {
      setIsLoading(true);
    }
    try {
      const [ordRes, custRes, itmRes, mktRes] = await Promise.all([
        fetch(`${API_URL}/orders`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API_URL}/customers`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API_URL}/items`, { headers: { 'x-tenant': tenant }, credentials: 'include' }),
        fetch(`${API_URL}/customers/marketers`, { headers: { 'x-tenant': tenant }, credentials: 'include' })
      ]);
      const [ord, cust, itm, mkt] = await Promise.all([ordRes.json(), custRes.json(), itmRes.json(), mktRes.json()]);
      if (ord.success) {
        setOrders(ord.data);
        ordersLoadedRef.current = true;
      }
      if (cust.success) setCustomers(cust.data);
      if (itm.success) setItems(itm.data || []);
      if (mkt.success && mkt.data?.marketers) setMarketers(mkt.data.marketers);
    } catch (err) {
      console.error('Failed to fetch orders data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant]);

  useLiveEvent(['ORDER_UPDATED', 'INVENTORY_CHANGED'], () => fetchData(true));

  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get('orderId') || searchParams.get('id');

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  useEffect(() => {
    if (orderIdParam && orders.length > 0) {
      const match = orders.find(o => o.id === orderIdParam);
      if (match) setSelectedOrderDetails(match);
    }
  }, [orderIdParam, orders]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [orderToDelete, setOrderToDelete] = useState(null);

  const openDeliverModal = (order) => {
    setSelectedOrder(order);
    setIsDeliverModalOpen(true);
  };

  const openEditModal = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const confirmDeleteOrder = async (id) => {
    try {
      const tenant = getCompanyFromCookie();
      const res = await fetch(`${API_URL}/orders/${id}`, { 
        method: 'DELETE', 
        headers: { 'x-tenant': tenant },
        credentials: 'include' 
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Order permanently deleted');
        fetchData();
      } else {
        toast.error(json.message || 'Failed to delete order');
      }
    } catch (_err) {
      toast.error('Error deleting order');
    } finally {
      setOrderToDelete(null);
    }
  };

  const isOwner = user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isMarketingManager = user?.role === 'MARKETING_MANAGER';
  const isTransportManager = user?.role === 'TRANSPORT_MANAGER';
  const canAddCustomer = !isTransportManager && (isOwner || isAdmin || isMarketingManager);
  const canCreateOrder = !isTransportManager && (isOwner || isAdmin || isAccountant || isMarketingManager);
  const canDeleteOrder = isOwner;
  const canSettleDebt = isOwner || isAdmin || isAccountant || isMarketingManager;

  // Unpaid/Partial order count for quick alerts
  const unpaidOrdersCount = orders.filter(o => o.paymentStatus !== 'PAID' && o.deliveryStatus !== 'CANCELLED').length;

  // Filter Orders
  const filteredOrders = orders.filter(o => {
    // Tab filtering
    if (activeTab === 'Pending Orders' && o.deliveryStatus !== 'PENDING') return false;
    if (activeTab === 'Unpaid Orders' && o.paymentStatus === 'PAID') return false;
    if (activeTab === 'Completed Orders' && (o.deliveryStatus !== 'DELIVERED' || o.paymentStatus !== 'PAID')) return false;
    if (activeTab === 'Cancelled Orders' && o.deliveryStatus !== 'CANCELLED') return false;
    
    // Marketer filtering
    if (selectedMarketer !== 'ALL') {
      const mRef = o.customer?.marketerRef || '';
      const mId = o.customer?.marketerId || '';
      if (selectedMarketer === 'DIRECT') {
        if (mId && mId !== 'DIRECT') return false;
        if (!mId && mRef && mRef.toLowerCase() !== 'direct') return false;
      } else {
        const matchId = mId === selectedMarketer;
        const matchRef = mRef.includes(selectedMarketer);
        if (!matchId && !matchRef) return false;
      }
    }

    // Client type multi-select filtering
    if (selectedClientTypes.length > 0) {
      const rawType = (o.customer?.type || '').toUpperCase();
      const matches = selectedClientTypes.some(t => {
        const target = t.toUpperCase();
        if (target.includes('HOME') || target.includes('HOUSE')) {
          return rawType.includes('HOME') || rawType.includes('HOUSE');
        }
        return rawType === target || rawType.includes(target);
      });
      if (!matches) return false;
    }

    // Dynamic finished goods product size filtering
    if (selectedSizes.length > 0) {
      const hasSize = o.items?.some(i => {
        const name = (i.item?.name || '').toLowerCase();
        return selectedSizes.some(sz => {
          const target = sz.toLowerCase();
          return name.includes(target);
        });
      });
      if (!hasSize) return false;
    }

    // Date filtering
    if (dateFilter !== 'ALL' && !orderMatchesDate(o, dateFilter)) return false;
    
    // Search query: Order ID, Customer Name, Phone Number, Customer Code, Marketer
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const orderIdStr = o.id.toLowerCase();
      const orderIdShort = `#${o.id.substring(0, 6).toLowerCase()}`;
      const custName = (o.customer?.name || '').toLowerCase();
      const custPhone = (o.customer?.phone || '').toLowerCase();
      const custCode = (o.customer?.customerCode || '').toLowerCase();
      const mktRef = (o.customer?.marketerRef || '').toLowerCase();
      
      const matchesSearch = orderIdStr.includes(q) || orderIdShort.includes(q) || custName.includes(q) || custPhone.includes(q) || custCode.includes(q) || mktRef.includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const pagination = usePagination(filteredOrders, 50, `${searchQuery}_${selectedClientTypes.join(',')}_${selectedSizes.join(',')}_${selectedMarketer}_${activeTab}_${dateFilter}`);

  const ordersKpi = useMemo(() => {
    let totalValue = 0;
    let totalPacks = 0;
    let totalBottles = 0;
    let totalLitres = 0;
    let unpaidAmount = 0;

    for (const o of filteredOrders) {
      const sub = (o.items || []).reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0);
      const total = o.withGst ? sub + Math.round(sub * 0.18) : sub;
      const paid = (o.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      totalValue += total;
      unpaidAmount += Math.max(0, total - paid);
      for (const it of (o.items || [])) {
        const q = Number(it.quantity || 0);
        const nameLower = (it.item?.name || '').toLowerCase();
        const unitLower = (it.item?.unit || '').toLowerCase();
        const isBulkOrLitre = nameLower.includes('bulk') || unitLower === 'litres' || unitLower === 'litre';

        if (isBulkOrLitre) totalLitres += q;
        else if (Number(it.item?.packSize || 1) > 1) totalPacks += q;
        else totalBottles += q;
      }
    }

    return { totalValue, totalPacks, totalBottles, totalLitres, unpaidAmount };
  }, [filteredOrders]);

  const hasActiveOrderFilters = selectedSizes.length > 0 || selectedClientTypes.length > 0 || dateFilter !== 'ALL' || selectedMarketer !== 'ALL';
  const handleResetOrderFilters = () => {
    setSelectedSizes([]);
    setSelectedClientTypes([]);
    setDateFilter('ALL');
    setSelectedMarketer('ALL');
  };

  const tabs = ['All Orders', 'Pending Orders', 'Unpaid Orders', 'Completed Orders', 'Cancelled Orders', 'Month-End Statements'];
  const productSizeOptions = useMemo(() => {
    const fgItems = items.filter(i => i.type === 'FINISHED_GOOD' && !i.archivedAt);
    if (fgItems.length > 0) {
      return fgItems.map(i => ({ value: i.name, label: i.name }));
    }
    return [
      { value: '19L', label: '19L Refill' },
      { value: '1.5L', label: '1.5L PET' },
      { value: '0.5L', label: '0.5L PET' }
    ];
  }, [items]);

  // Month-End Statements aggregation
  const statementList = useMemo(() => {
    const monthOrders = orders.filter(o => {
      const rawDate = o.expectedDelivery || o.createdAt;
      if (!rawDate) return false;
      const d = parseOrderDate(rawDate);
      if (!d) return false;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}` === statementMonth;
    });

    const customerStatementMap = new Map();
    customers.forEach(c => {
      customerStatementMap.set(c.id, {
        customer: c,
        orders: [],
        delivered19L: 0,
        delivered15L: 0,
        delivered05L: 0,
        totalBilled: 0
      });
    });

    monthOrders.forEach(o => {
      const custId = o.customerId;
      if (!custId) return;
      if (!customerStatementMap.has(custId)) {
        customerStatementMap.set(custId, {
          customer: o.customer || { id: custId, name: 'Unknown' },
          orders: [],
          delivered19L: 0,
          delivered15L: 0,
          delivered05L: 0,
          totalBilled: 0
        });
      }
      const rec = customerStatementMap.get(custId);
      rec.orders.push(o);
      const isDelivered = o.deliveryStatus === 'DELIVERED';
      o.items?.forEach(i => {
        const q = Number(i.quantity || 0);
        const name = (i.item?.name || '').toLowerCase();
        if (isDelivered) {
          rec.totalBilled += q * Number(i.price || 0);
        }
        if (name.includes('19l')) rec.delivered19L += q;
        else if (name.includes('1.5') || name.includes('1.5l')) rec.delivered15L += q;
        else if (name.includes('0.5') || name.includes('500ml')) rec.delivered05L += q;
      });
    });

    return Array.from(customerStatementMap.values()).filter(s => {
      const bal = Number(s.customer?.currentBalance || 0);
      return s.orders.length > 0 || bal > 0;
    });
  }, [orders, customers, statementMonth]);



  return (
    <div className="space-y-4 pb-6">
      {selectedOrderDetails ? (
        <OrderDetail
          order={selectedOrderDetails}
          onClose={() => setSelectedOrderDetails(null)}
          onSettle={(order) => openDeliverModal(order)}
        />
      ) : (
        <>
          {/* Page Header */}
          <PageHeader
        title="Orders & Dispatches"
        actions={
          <div className="flex items-center gap-2">
            {canAddCustomer && (
              <button 
                onClick={() => setIsAddCustomerModalOpen(true)}
                className="btn-secondary"
              >
                <UserPlus size={14} /> <span>New Customer</span>
              </button>
            )}
            {canCreateOrder && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="btn-primary"
              >
                <Plus size={14} /> <span>New Order</span> <span className="text-[10px] opacity-75 hidden md:inline">(Alt+N)</span>
              </button>
            )}
          </div>
        }
      />

      {/* Top Banner Alert for Unpaid Orders */}
      {unpaidOrdersCount > 0 && activeTab !== 'Unpaid Orders' && (
        <div className="bg-amber-50/90 border border-amber-200/80 px-4 py-2.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
            <span>You have <strong>{unpaidOrdersCount}</strong> unpaid or partial order{unpaidOrdersCount > 1 ? 's' : ''} awaiting settlement.</span>
          </div>
          <button 
            onClick={() => setActiveTab('Unpaid Orders')} 
            className="font-bold text-amber-800 hover:text-amber-950 bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-200 transition-all text-xs shrink-0 self-end sm:self-auto"
          >
            View Unpaid &rarr;
          </button>
        </div>
      )}

      {/* TIER 1: Dedicated Full-Width Status Tabs */}
      <div className="overflow-x-auto scrollbar-none py-0.5">
        <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 min-w-max">
          {tabs.map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap shrink-0 transition-all ${
                activeTab === tab 
                  ? 'bg-white text-slate-900 shadow-2xs font-bold ring-1 ring-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* TIER 2: Search & Multi-Select Filter Toolbar */}
      <div className="card-surface p-3 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <OrderSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <TimeframeDropdown 
            value={dateFilter}
            onChange={setDateFilter}
            options={DATE_FILTER_OPTIONS}
          />

          {/* Marketer Filter Dropdown */}
          <select
            aria-label="Filter by Marketer"
            value={selectedMarketer}
            onChange={e => setSelectedMarketer(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-brand shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
          >
            <option value="ALL">All Marketers</option>
            <option value="DIRECT">Direct / Company</option>
            {marketers.map(m => (
              <option key={m.id} value={m.id}>
                {m.id} • {m.name}
              </option>
            ))}
          </select>

          <MultiSelectDropdown
            label="Sizes"
            icon={Package}
            options={productSizeOptions}
            selectedValues={selectedSizes}
            onChange={setSelectedSizes}
          />

          <MultiSelectDropdown
            label="Clients"
            icon={Users}
            options={STANDARDIZED_CLIENT_OPTIONS}
            selectedValues={selectedClientTypes}
            onChange={setSelectedClientTypes}
          />

          {hasActiveOrderFilters && (
            <button
              type="button"
              onClick={handleResetOrderFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-2xs"
              title="Reset order filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* DYNAMIC ORDERS KPI STRIP */}
      {activeTab !== 'Month-End Statements' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Package size={14} className="text-slate-400" />
            <span>Showing <strong className="text-slate-900">{filteredOrders.length}</strong> Orders</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <div>
              Total Value: <strong className="text-slate-900 font-bold">Rs. {ordersKpi.totalValue.toLocaleString()}</strong>
            </div>
            <div>
              Volume:{' '}
              <strong className="text-slate-900 font-bold">
                {[
                  ordersKpi.totalPacks > 0 ? `${ordersKpi.totalPacks.toLocaleString()} ${ordersKpi.totalPacks === 1 ? 'pack' : 'packs'}` : null,
                  ordersKpi.totalBottles > 0 ? `${ordersKpi.totalBottles.toLocaleString()} ${ordersKpi.totalBottles === 1 ? 'bottle' : 'bottles'}` : null,
                  ordersKpi.totalLitres > 0 ? `${ordersKpi.totalLitres.toLocaleString()} L` : null
                ].filter(Boolean).join(' + ') || '0 items'}
              </strong>
            </div>
            <div>
              Unpaid Dues: <strong className={ordersKpi.unpaidAmount > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>Rs. {ordersKpi.unpaidAmount.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}

      {isLoading && orders.length === 0 ? (
        <TableSkeleton rows={6} cols={6} />
      ) : activeTab === 'Month-End Statements' ? (
        <div className="space-y-4">
          <div className="card-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Customer Monthly Ledgers & Statements</h3>
              <p className="text-xs text-slate-500">Breakdown of delivered bottle sizes, billed volumes, and debt collection for the month.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Statement Month:</label>
              <input
                type="month"
                value={statementMonth}
                onChange={e => setStatementMonth(e.target.value)}
                className="input-base text-xs py-1.5 px-3 font-semibold bg-white"
              />
            </div>
          </div>

          <div className="table-container">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead>
                <tr>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Customer Code</th>
                  <th className="table-th text-center">Month Orders</th>
                  <th className="table-th">Delivered Breakdown</th>
                  <th className="table-th text-right">Month Billed</th>
                  <th className="table-th text-right">Current Debt</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {statementList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No customer orders or outstanding debt recorded for {statementMonth}.
                    </td>
                  </tr>
                ) : (
                  statementList.map(s => {
                    const cust = s.customer || {};
                    const balance = Number(cust.currentBalance || 0);
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="table-td">
                          <div className="font-bold text-slate-800">{cust.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{cust.phone || '—'}</div>
                        </td>
                        <td className="table-td">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                            {cust.customerCode || `#${cust.id?.substring(0, 6).toUpperCase()}`}
                          </span>
                        </td>
                        <td className="table-td text-center font-bold text-slate-700">
                          {s.orders.length}
                        </td>
                        <td className="table-td">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {s.delivered19L > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold font-mono text-[11px]">
                                {s.delivered19L} btl × 19L
                              </span>
                            )}
                            {s.delivered15L > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold font-mono text-[11px]">
                                {s.delivered15L} {isWadaana ? 'btl' : 'pk'} × 1.5L
                              </span>
                            )}
                            {s.delivered05L > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold font-mono text-[11px]">
                                {s.delivered05L} {isWadaana ? 'btl' : 'pk'} × 0.5L
                              </span>
                            )}
                            {s.delivered19L === 0 && s.delivered15L === 0 && s.delivered05L === 0 && (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </div>
                        </td>
                        <td className="table-td text-right font-mono font-bold text-slate-800">
                          Rs. {Math.round(s.totalBilled).toLocaleString()}
                        </td>
                        <td className="table-td text-right font-mono font-bold">
                          {balance === 0 ? (
                            <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Cleared (Rs. 0)
                            </span>
                          ) : (
                            <span className="text-rose-700 font-black">
                              Rs. {balance.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="table-td text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {canSettleDebt && balance > 0 && (
                              <button
                                type="button"
                                onClick={() => setSettleCustomer(cust)}
                                className="px-2.5 py-1 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand/90 transition shadow-xs"
                              >
                                Settle Debt
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => shareOrSendMonthlyStatementWhatsApp({ customer: cust, month: statementMonth, orders: s.orders, isWadaana })}
                              className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition shadow-xs flex items-center gap-1"
                              title="Send Monthly Statement via WhatsApp"
                            >
                              <Share2 size={12} /> WhatsApp
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                <th className="table-th">Order ID</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Order Details</th>
                <th className="table-th">Target Date</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-500">
                      <p>No orders found.</p>
                      {(dateFilter !== 'ALL' || selectedClientTypes.length > 0 || selectedSizes.length > 0 || searchQuery) && (
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              handleResetOrderFilters();
                              setSearchQuery('');
                            }}
                            className="text-xs text-brand hover:underline font-semibold"
                          >
                            Clear filters
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                pagination.paginatedItems.map(o => {
                  const isFullyGreenlit = o.deliveryStatus === 'DELIVERED' && o.paymentStatus === 'PAID';
                  const needsPaymentSettlement = o.deliveryStatus === 'DELIVERED' && o.paymentStatus !== 'PAID';
                  const canProcess = !isTransportManager && o.deliveryStatus !== 'CANCELLED' && !isFullyGreenlit;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td 
                        className="table-td font-mono font-semibold text-slate-500 cursor-pointer hover:text-brand transition-colors"
                        onClick={() => setSelectedOrderDetails(o)}
                        title="Click to view details"
                      >
                        #{o.id.substring(0,6).toUpperCase()}
                      </td>
                      <td 
                        className="table-td cursor-pointer group"
                        onClick={() => setSelectedOrderDetails(o)}
                        title="Click to view details"
                      >
                        <div className="font-bold text-slate-800 group-hover:text-brand transition-colors">{o.customer?.name}</div>
                        <div className="flex gap-2 items-center text-xs mt-0.5">
                          <span className="text-slate-400 font-mono">{o.customer?.phone}</span>
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1 text-xs">
                            {formatOrderItemsSummary(o.items)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-xs">
                              {formatItemName(o.items[0]?.item?.name)}{' '}
                              {o.items[0]?.item && (
                                <span className="text-[10px] font-normal text-slate-400">
                                  ({formatItemUnitTag(o.items[0].item, o.items[0].quantity)})
                                </span>
                              )}
                            </span>
                            {o.items?.length > 1 && (
                              <span className="text-[10px] font-bold text-brand bg-brand-light px-1.5 py-0.5 rounded w-max">
                                +{o.items.length - 1} more item{o.items.length > 2 ? 's' : ''}
                              </span>
                            )}
                            {o.remarks && <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{o.remarks}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-xs text-slate-600">
                        {o.expectedDelivery ? (
                          <div className="flex items-center gap-1 font-mono text-slate-600"><Clock size={13}/> {parseOrderDate(o.expectedDelivery)?.toLocaleDateString()}</div>
                        ) : <span className="text-slate-400 text-xs">Not set</span>}
                      </td>
                      <td className="table-td">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={o.deliveryStatus} />
                          {o.deliveryStatus !== 'CANCELLED' && (
                            <StatusBadge status={o.paymentStatus} />
                          )}
                        </div>
                      </td>
                      <td className="table-td text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          <button
                            onClick={() => setSelectedOrderDetails(o)}
                            className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1 font-semibold"
                            title="View Order Details & Share to Driver"
                          >
                            <Eye size={13} /> Details
                          </button>

                          {isTransportManager && (
                            <>
                              <button
                                onClick={() => {
                                  const text = WhatsAppTemplates.orderDispatch(o, isWadaana);
                                  navigator.clipboard.writeText(text);
                                  toast.success('Complete driver order dispatch copied!');
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                title="Quick copy order dispatch for driver"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  const text = WhatsAppTemplates.orderDispatch(o, isWadaana);
                                  openWhatsAppWeb('', text);
                                  toast.success('Opening WhatsApp to dispatch order to driver.');
                                }}
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                title="Share to driver via WhatsApp"
                              >
                                <Share2 size={13} />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setInvoiceOrder(o)}
                            className="btn-secondary py-1 px-2.5 text-xs"
                            title="Print Invoice"
                          >
                            <Printer size={13} /> Invoice
                          </button>

                          {(isOwner || isAdmin || isAccountant || isMarketingManager) && o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED' && (
                            <button onClick={() => openEditModal(o)} className="btn-secondary py-1 px-2.5 text-xs">
                              Edit
                            </button>
                          )}
                          {canProcess && (
                            <button 
                              onClick={() => openDeliverModal(o)} 
                              className={`py-1 px-3 text-xs rounded-xl font-bold transition-all ${
                                needsPaymentSettlement 
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                  : 'btn-primary'
                              }`}
                            >
                              {needsPaymentSettlement ? 'Settle Payment' : 'Process'}
                            </button>
                          )}
                          {canDeleteOrder && (
                            <button
                              onClick={() => setOrderToDelete(o)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Permanently Delete Order (Owner Only)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <TablePagination pagination={pagination} />
        </div>
      )}
      </>
    )}

      {/* Add Order Modal Component */}
      {isAddModalOpen && (
        <AddOrderModal 
          onClose={() => setIsAddModalOpen(false)} 
          onOrderAdded={() => { setIsAddModalOpen(false); fetchData(); }} 
          customers={customers} 
          items={items} 
        />
      )}

      {/* Add Customer Modal Component */}
      {isAddCustomerModalOpen && (
        <AddCustomerModal 
          isOpen={isAddCustomerModalOpen}
          onClose={() => setIsAddCustomerModalOpen(false)} 
          onCustomerAdded={() => { setIsAddCustomerModalOpen(false); fetchData(); }} 
        />
      )}

      {/* Process Delivery Modal Component */}
      {isDeliverModalOpen && selectedOrder && (
        <ProcessDeliveryModal 
          order={selectedOrder}
          onClose={() => { setIsDeliverModalOpen(false); setSelectedOrder(null); }}
          onDeliveryProcessed={() => { setIsDeliverModalOpen(false); setSelectedOrder(null); fetchData(); }}
        />
      )}

      {/* Edit Order Modal Component */}
      {isEditModalOpen && selectedOrder && (
        <EditOrderModal 
          order={selectedOrder}
          onClose={() => { setIsEditModalOpen(false); setSelectedOrder(null); }}
          onOrderEdited={() => { setIsEditModalOpen(false); setSelectedOrder(null); fetchData(); }}
          customers={customers}
          items={items}
        />
      )}

      {/* Record Payment Modal Component */}
      {isRecordPaymentOpen && selectedPaymentOrder && (
        <RecordPaymentModal
          order={selectedPaymentOrder}
          onClose={() => { setIsRecordPaymentOpen(false); setSelectedPaymentOrder(null); }}
          onSuccess={() => { fetchData(); }}
        />
      )}

      {/* Order Invoice Modal Component */}
      {invoiceOrder && (
        <OrderInvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}


      {/* Permanent Delete Order Modal (Owner Only) */}
      <DeleteConfirmationModal
        isOpen={Boolean(orderToDelete)}
        title={`Delete Order #${orderToDelete?.id?.substring(0, 8).toUpperCase()}`}
        message={`Are you sure you want to permanently delete order #${orderToDelete?.id?.substring(0, 8).toUpperCase()} for ${orderToDelete?.customer?.name || 'Customer'}? This will remove all records and roll back any delivered stock and customer balances.`}
        confirmText="Delete Order"
        onConfirm={() => confirmDeleteOrder(orderToDelete.id)}
        onClose={() => setOrderToDelete(null)}
      />

      {settleCustomer && (
        <SettleCustomerDebtModal
          customer={settleCustomer}
          onClose={() => setSettleCustomer(null)}
          onSuccess={() => {
            setSettleCustomer(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}


import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  
  // Role checks based on Goal_Requirements.md
  const isOwner = user?.role === 'OWNER';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isAdmin = user?.role === 'ADMIN';
  const isProductionManager = user?.role === 'PRODUCTION_MANAGER';
  
  const canViewFinancials = isOwner || isAccountant;
  const canViewInventory = isOwner || isAdmin || isProductionManager;

  return (
    <div className="space-y-6">
      {/* Top Small KPIs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {canViewFinancials && (
          <>
            <SmallKpiCard title="TODAY'S SALES" value="Rs. 0" color="text-[#0ea5e9]" />
            <SmallKpiCard title="CASH COLLECTED" value="Rs. 0" color="text-[#059669]" />
            <SmallKpiCard title="CREDIT SALES" value="Rs. 0" color="text-[#ea580c]" />
            <SmallKpiCard title="EXPENSES" value="Rs. 0" color="text-[#dc2626]" />
            {isOwner && <SmallKpiCard title="EST. PROFIT" value="Rs. 0" color="text-[#16a34a]" />}
          </>
        )}
      </div>

      {/* Main KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canViewFinancials && (
          <>
            <LargeKpiCard title="TODAY'S SALES" value="Rs. 0" subtitle="Total sales value" color="text-[#0ea5e9]" />
            <LargeKpiCard title="TODAY'S COLLECTION" value="Rs. 0" subtitle="Cash received today" color="text-[#059669]" />
            <LargeKpiCard title="TODAY'S CREDIT SALES" value="Rs. 0" subtitle="Billed on credit" color="text-[#ea580c]" />
            <LargeKpiCard title="TODAY'S EXPENSES" value="Rs. 0" subtitle="Logged operating cost" color="text-[#dc2626]" />
            {isOwner && <LargeKpiCard title="TODAY'S EST. PROFIT" value="Rs. 0" subtitle="Sales minus COGS & Expenses" color="text-[#16a34a]" />}
          </>
        )}
        
        <LargeKpiCard title="PENDING ORDERS" value="0" subtitle="Awaiting delivery" color="text-[#ea580c]" />
        <LargeKpiCard title="COMPLETED ORDERS" value="0" subtitle="Delivered today" color="text-[#059669]" />
        
        {canViewFinancials && (
          <>
            <LargeKpiCard title="CUSTOMER OUTSTANDING" value="Rs. 0" subtitle="Total credit receivable" color="text-[#dc2626]" />
            <LargeKpiCard title="VENDOR OUTSTANDING" value="Rs. 0" subtitle="Total payables due" color="text-[#dc2626]" />
          </>
        )}
        
        <LargeKpiCard title="TOTAL CUSTOMERS" value="0" subtitle="Registered profiles" color="text-[#1f2937]" />
        <LargeKpiCard title="TOTAL VENDORS" value="0" subtitle="Registered suppliers" color="text-[#1f2937]" />
      </div>

      {canViewInventory && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mt-8 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Chemical Stock Gauges</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChemicalGauge name="Calcium" percentage={75} color="bg-emerald-500" />
            <ChemicalGauge name="Magnesium" percentage={45} color="bg-amber-500" />
            <ChemicalGauge name="Sodium" percentage={15} color="bg-red-500" />
          </div>
        </div>
      )}

      {/* Tabs Section */}
      <div className="bg-white border border-slate-200 rounded-xl mt-8">
        <div className="flex items-center gap-6 p-4 border-b border-slate-200 bg-[#f8fafc] rounded-t-xl overflow-x-auto">
          <button className="px-4 py-1.5 bg-white border border-[#e2e8f0] text-[#0ea5e9] font-bold text-sm rounded-md shadow-sm">
            Overview
          </button>
          {canViewFinancials && (
            <button className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              Sales Analytics
            </button>
          )}
          {canViewFinancials && (
            <button className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              Financial Overview
            </button>
          )}
        </div>
        <div className="p-8 h-64 flex items-center justify-center text-muted-foreground">
          Detailed overview charts will be implemented here.
        </div>
      </div>
    </div>
  );
}

function ChemicalGauge({ name, percentage, color }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{name}</span>
        <span className="text-xs font-bold text-foreground">{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function SmallKpiCard({ title, value, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-center">
      <h4 className="text-[11px] font-bold text-[#6b7280] tracking-wider mb-2 uppercase">{title}</h4>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function LargeKpiCard({ title, value, subtitle, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[130px] justify-between transition-shadow hover:shadow-md">
      <div>
        <h4 className="text-[11px] font-bold text-[#6b7280] tracking-wider mb-3 uppercase">{title}</h4>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      </div>
      <p className="text-xs text-[#6b7280] font-medium">{subtitle}</p>
    </div>
  );
}

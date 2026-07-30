import { PackageCheck, Search, Flame, Droplets } from 'lucide-react';

export default function InventoryHeader({ 
  search, 
  onSearchChange, 
  tenant = 'aquasphere',
  totalFinishedGoods = 0,
  totalUnitsCount = 0
}) {
  const isWadaana = tenant === 'wadaana';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
            isWadaana 
              ? 'bg-sky-50 text-[#0ea5e9] border border-sky-200' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {isWadaana ? <Flame size={12} /> : <Droplets size={12} />}
            {isWadaana ? 'WADAANA WAREHOUSE' : 'AQUASPHERE WAREHOUSE'}
          </span>
          <span className="text-xs text-slate-400 font-semibold">Finished Goods Stock Ledger</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800">Finished Goods Inventory</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {isWadaana 
            ? 'Track real-time stock levels of Wadaana bulk single preform bottles and their origin sources.'
            : 'Track real-time stock levels of AquaSphere 19L refills, 0.5L packs, and 1.5L packs.'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Live Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search finished goods..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:bg-white ${
              isWadaana ? 'focus:border-[#0ea5e9]' : 'focus:border-emerald-500'
            } transition-all`}
          />
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-3 bg-slate-100/80 px-4 py-2.5 rounded-xl border border-slate-200/80">
          <div className={`p-1.5 rounded-lg ${isWadaana ? 'bg-sky-100 text-[#0ea5e9]' : 'bg-emerald-100 text-emerald-700'}`}>
            <PackageCheck size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Products</div>
            <div className="text-sm font-black text-slate-800">{totalFinishedGoods} Types ({totalUnitsCount.toLocaleString()} units)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

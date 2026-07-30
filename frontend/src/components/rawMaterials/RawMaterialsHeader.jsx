import { Plus, Search, Layers, Sparkles } from 'lucide-react';

export default function RawMaterialsHeader({ 
  search, 
  onSearchChange, 
  includeArchived, 
  onToggleArchived, 
  onOpenAdd, 
  tenant = 'aquasphere',
  isMarketingManager = false
}) {
  const isWadaana = tenant === 'wadaana';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${isWadaana ? 'bg-sky-50 text-[#0ea5e9]' : 'bg-emerald-50 text-emerald-600'} shadow-inner`}>
            {isWadaana ? <Sparkles size={28} /> : <Layers size={28} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {isWadaana ? 'Wadaana Preform Master' : 'Raw Material Inventory'}
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                isWadaana ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {isWadaana ? 'Preform / kg' : 'Plant Stock'}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              {isWadaana 
                ? 'Manage Pure & Mix preform stock (in kg) used for blowing 0.5L and 1.5L bottles'
                : 'Pre-defined bottling supplies, caps, labels, and packaging materials for plant operations'
              }
            </p>
          </div>
        </div>

        {!isMarketingManager && (
          <button
            onClick={onOpenAdd}
            className={`${
              isWadaana 
                ? 'bg-[#0ea5e9] hover:bg-[#0284c7] shadow-sky-500/20' 
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            } text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2.5 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] self-start sm:self-auto`}
          >
            <Plus size={20} className="stroke-[2.5]" /> 
            <span>{isWadaana ? 'Add Preform Material' : 'Add Raw Material'}</span>
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="search"
            placeholder={isWadaana ? "Search preform type (e.g. Pure, Mix, 0.5L)..." : "Search material name..."}
            className={`w-full border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 ${
              isWadaana ? 'focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9]' : 'focus:ring-emerald-500/20 focus:border-emerald-500'
            } transition-all bg-white text-sm font-medium shadow-sm`}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-slate-600 font-semibold cursor-pointer select-none self-start sm:self-auto hover:text-slate-800 transition-colors">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => onToggleArchived(e.target.checked)}
            className={`rounded-md border-slate-300 ${
              isWadaana ? 'text-[#0ea5e9] focus:ring-[#0ea5e9]' : 'text-emerald-600 focus:ring-emerald-500'
            } h-4 w-4 transition-colors`}
          />
          <span>Show Archived Materials</span>
        </label>
      </div>
    </div>
  );
}

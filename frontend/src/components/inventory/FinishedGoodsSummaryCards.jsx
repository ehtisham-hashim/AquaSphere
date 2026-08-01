import { Flame, Droplets, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function FinishedGoodsSummaryCards({ items = [], tenant = 'aquasphere' }) {
  const isWadaana = tenant === 'wadaana';

  if (!isWadaana) {
    const qty05 = items
      .filter(i => (i.type === 'FINISHED_GOOD' || !i.type) && (i.name.toLowerCase().includes('0.5') || i.name.toLowerCase().includes('500')))
      .reduce((sum, i) => sum + Number(i.cachedQty || 0), 0);

    const qty15 = items
      .filter(i => (i.type === 'FINISHED_GOOD' || !i.type) && (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500')))
      .reduce((sum, i) => sum + Number(i.cachedQty || 0), 0);

    const qty19 = items
      .filter(i => (i.type === 'FINISHED_GOOD' || !i.type) && (i.name.toLowerCase().includes('19')))
      .reduce((sum, i) => sum + Number(i.cachedQty || 0), 0);

    const netPacks05 = Math.max(0, qty05);
    const fullPacks05 = Math.floor(netPacks05);
    const looseBottles05 = Math.round((netPacks05 - fullPacks05) * 12);
    const totalBottles05 = Math.round(netPacks05 * 12);

    const netPacks15 = Math.max(0, qty15);
    const fullPacks15 = Math.floor(netPacks15);
    const looseBottles15 = Math.round((netPacks15 - fullPacks15) * 6);
    const totalBottles15 = Math.round(netPacks15 * 6);

    const totalBottles19 = Math.round(Math.max(0, qty19));

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 0.5L Packs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Finished 0.5L PET Packs</span>
            <div className="text-2xl font-black text-emerald-700">
              {fullPacks05.toLocaleString()} <span className="text-sm font-semibold text-slate-500">Packs</span>
              {looseBottles05 > 0 && (
                <span className="text-sm font-bold text-emerald-600 ml-1.5">+ {looseBottles05} loose</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Droplets size={12} className="text-emerald-500" />
              <span>Total: <strong className="text-slate-800 font-bold">{totalBottles05.toLocaleString()} Bottles</strong> (12/pack)</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 flex flex-col items-center">
            <span className="text-xs font-black">0.5L</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase">PET</span>
          </div>
        </div>

        {/* 1.5L Packs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Finished 1.5L PET Packs</span>
            <div className="text-2xl font-black text-purple-700">
              {fullPacks15.toLocaleString()} <span className="text-sm font-semibold text-slate-500">Packs</span>
              {looseBottles15 > 0 && (
                <span className="text-sm font-bold text-purple-600 ml-1.5">+ {looseBottles15} loose</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Droplets size={12} className="text-purple-500" />
              <span>Total: <strong className="text-slate-800 font-bold">{totalBottles15.toLocaleString()} Bottles</strong> (6/pack)</span>
            </div>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl border border-purple-100 flex flex-col items-center">
            <span className="text-xs font-black">1.5L</span>
            <span className="text-[10px] font-bold text-purple-600 uppercase">PET</span>
          </div>
        </div>

        {/* 19L PC Bottles */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">19L PC Refill Bottles</span>
            <div className="text-2xl font-black text-blue-900">{totalBottles19.toLocaleString()} <span className="text-sm font-semibold text-slate-500">Bottles</span></div>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Droplets size={12} className="text-blue-500" />
              <span>Total: <strong className="text-slate-800 font-bold">{totalBottles19.toLocaleString()} Bottles</strong> (24L)</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 flex flex-col items-center">
            <span className="text-xs font-black">19L</span>
            <span className="text-[10px] font-bold text-blue-600 uppercase">PC</span>
          </div>
        </div>
      </div>
    );
  }

  // Wadaana Cards (4 Single Preform Bottle Types)
  const pure05 = items.find(i => i.name.toLowerCase().includes('pure') && (i.name.toLowerCase().includes('0.5') || i.name.toLowerCase().includes('500ml')));
  const pure15 = items.find(i => i.name.toLowerCase().includes('pure') && (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500ml')));
  const mix05  = items.find(i => i.name.toLowerCase().includes('mix') && (i.name.toLowerCase().includes('0.5') || i.name.toLowerCase().includes('500ml')));
  const mix15  = items.find(i => i.name.toLowerCase().includes('mix') && (i.name.toLowerCase().includes('1.5') || i.name.toLowerCase().includes('1500ml')));

  const cards = [
    { name: '0.5L Pure Preform', weight: '15g', item: pure05, color: 'cyan' },
    { name: '1.5L Pure Preform', weight: '30g', item: pure15, color: 'sky' },
    { name: '0.5L Mix Preform', weight: '13g', item: mix05, color: 'amber' },
    { name: '1.5L Mix Preform', weight: '27g', item: mix15, color: 'orange' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, idx) => {
        const qty = Number(c.item?.cachedQty || 0);
        const reorder = Number(c.item?.reorderLevel || 100);
        const isLow = qty <= reorder;

        return (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{c.name}</span>
              <div className="text-xl font-black text-slate-800">
                {qty.toLocaleString()} <span className="text-xs font-normal text-slate-500">Pcs</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span>Weight: {c.weight}</span>
                <span>&bull;</span>
                {isLow ? (
                  <span className="text-amber-600 font-bold flex items-center gap-0.5">
                    <AlertTriangle size={10} /> Low Stock
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> In Stock
                  </span>
                )}
              </div>
            </div>
            <div className="p-2.5 bg-sky-50 text-[#0ea5e9] rounded-xl font-extrabold text-xs border border-sky-100 flex items-center gap-1">
              <Flame size={14} />
              <span>{c.weight}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

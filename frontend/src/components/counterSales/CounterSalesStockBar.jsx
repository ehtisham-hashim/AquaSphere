import { Package, Droplets } from 'lucide-react';

export default function CounterSalesStockBar({ 
  full05L, 
  loose05L, 
  totalBottles05L, 
  full15L, 
  loose15L, 
  totalBottles15L, 
  available19LBottles 
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
      <div className="space-y-0.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
          <Package size={13}/> 0.5L Finished Packs
        </span>
        <div className="text-lg font-black text-slate-800">
          {full05L.toLocaleString()} Packs {loose05L > 0 && <span className="text-xs text-emerald-600 font-bold">+ {loose05L} loose</span>}
        </div>
        <span className="text-[10px] text-slate-500 font-medium">Total: {totalBottles05L.toLocaleString()} Bottles (12/pack)</span>
      </div>

      <div className="space-y-0.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
          <Package size={13}/> 1.5L Finished Packs
        </span>
        <div className="text-lg font-black text-slate-800">
          {full15L.toLocaleString()} Packs {loose15L > 0 && <span className="text-xs text-purple-600 font-bold">+ {loose15L} loose</span>}
        </div>
        <span className="text-[10px] text-slate-500 font-medium">Total: {totalBottles15L.toLocaleString()} Bottles (6/pack)</span>
      </div>

      <div className="space-y-0.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
          <Droplets size={13}/> 19L Refill Bottles
        </span>
        <div className="text-lg font-black text-slate-800">{available19LBottles.toLocaleString()} Bottles</div>
        <span className="text-[10px] text-slate-500 font-medium">24L water per refill bottle</span>
      </div>
    </div>
  );
}

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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="card-surface p-3.5 space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
          <Package size={13}/> 0.5L Finished Packs
        </span>
        <div className="text-base sm:text-lg font-mono font-bold text-slate-800">
          {full05L.toLocaleString()} Packs {loose05L > 0 && <span className="text-xs text-brand font-semibold font-sans">+ {loose05L} loose</span>}
        </div>
        <span className="text-[10px] text-slate-400 font-medium block">Total: {totalBottles05L.toLocaleString()} bottles (12/pack)</span>
      </div>

      <div className="card-surface p-3.5 space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1.5">
          <Package size={13}/> 1.5L Finished Packs
        </span>
        <div className="text-base sm:text-lg font-mono font-bold text-slate-800">
          {full15L.toLocaleString()} Packs {loose15L > 0 && <span className="text-xs text-sky-600 font-semibold font-sans">+ {loose15L} loose</span>}
        </div>
        <span className="text-[10px] text-slate-400 font-medium block">Total: {totalBottles15L.toLocaleString()} bottles (6/pack)</span>
      </div>

      <div className="card-surface p-3.5 space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Droplets size={13}/> 19L Refill Bottles
        </span>
        <div className="text-base sm:text-lg font-mono font-bold text-slate-800">{available19LBottles.toLocaleString()} Bottles</div>
        <span className="text-[10px] text-slate-400 font-medium block">24L water per refill bottle</span>
      </div>
    </div>
  );
}

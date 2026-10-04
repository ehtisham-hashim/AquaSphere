import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { API_URL as API } from '../../../utils/api';
import { useTenant } from '../../../context/TenantContext';
import { useLiveEvent } from '../../../context/SSEContext';
import { TimeframeDropdown } from '../../ui';

export default function ProductionScrapLossWidget({
  timeframe: propTimeframe,
  showDropdown = false,
  className = ''
}) {
  const { tenant } = useTenant();
  const [internalTimeframe, setInternalTimeframe] = useState('1_MONTH');
  const activeTimeframe = propTimeframe || internalTimeframe;

  const [lossData, setLossData] = useState({
    totalWasteBottles: 0,
    batchCount: 0,
    materials: []
  });
  const [loading, setLoading] = useState(true);

  const fetchLoss = useCallback(async () => {
    try {
      const res = await fetch(`${API}/analytics/production-loss?tenant=${tenant}&timeframe=${activeTimeframe}`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success && json.data) {
        setLossData(json.data);
      }
    } catch (err) {
      console.error('Error fetching production loss analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [tenant, activeTimeframe]);

  useEffect(() => {
    setLoading(true);
    fetchLoss();
  }, [fetchLoss]);

  // Real-time SSE updates on production completion
  useLiveEvent('PRODUCTION_UPDATED', fetchLoss);

  const { totalWasteBottles = 0, batchCount = 0, materials = [] } = lossData;

  return (
    <div className={`card-surface p-5 sm:p-6 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600">
            <Trash2 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Production Scrap & Material Loss
            </h3>
            <p className="text-[11px] text-slate-400">
              Physical inventory lost during bottling & preform blowing runs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showDropdown && (
            <TimeframeDropdown
              value={activeTimeframe}
              onChange={setInternalTimeframe}
            />
          )}
          {loading && (
            <RefreshCw size={14} className="text-slate-400 animate-spin" />
          )}
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Broken / Damaged Bottles
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-xl font-black font-mono ${totalWasteBottles > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {totalWasteBottles.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">bottles</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Batches Analyzed
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono text-slate-800">
              {batchCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">runs</span>
          </div>
        </div>
      </div>

      {/* Physical Materials Consumed / Lost in Scrap */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Raw Materials Scrapped
          </span>
          <span className="text-[10px] text-slate-400">
            Shrink wrap film excluded
          </span>
        </div>

        {materials.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center flex flex-col items-center justify-center gap-1.5">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">Zero Material Scrap</span>
            <span className="text-[11px] text-slate-400">No raw material loss recorded for this period.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {materials.map((mat, idx) => {
              const isCountable = mat.unit === 'bottle' || mat.unit === 'cap' || mat.unit === 'pcs' || mat.unit === 'unit';
              const displayVal = isCountable 
                ? `${Math.round(mat.quantity).toLocaleString()} ${mat.unit}`
                : `${Number(mat.quantity).toFixed(3).replace(/\.?0+$/, '')} ${mat.unit}`;

              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex items-center justify-between transition shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-semibold text-xs text-slate-800">{mat.name}</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                    -{displayVal}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note: Physical tracking only */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
        <AlertCircle size={12} className="text-slate-400 shrink-0" />
        <span>Strict physical unit deduction (pieces & kg). Cost tracking disabled.</span>
      </div>
    </div>
  );
}

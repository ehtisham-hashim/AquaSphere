import { useMemo } from 'react';
import { Flame, TrendingUp, Package, Scale } from 'lucide-react';
import { PREFORM_CATALOG, parsePreformInfo } from '../../utils/preformHelper';

export default function PreformConsumptionSummary({ batches = [], isWadaana }) {
  // Calculate today's preform consumption across all 6 preform types
  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Initialize tracking for all 6 catalog preform types
    const consumptionMap = {};
    PREFORM_CATALOG.forEach(p => {
      consumptionMap[p.id] = {
        ...p,
        grams: 0,
        kg: 0,
        bottles: 0
      };
    });

    let overallBottles = 0;
    let overallGrams = 0;

    batches.forEach(batch => {
      // Check if batch is from today
      const createdDate = new Date(batch.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      const isTodayBatch = createdDate.getTime() === today.getTime() ||
        (batch.batchDate && new Date(batch.batchDate).toDateString() === today.toDateString());

      if (!isTodayBatch) return;

      // 1. If explicit consumptions exist, add them
      if (Array.isArray(batch.consumptions) && batch.consumptions.length > 0) {
        batch.consumptions.forEach(c => {
          const rawName = c.item?.name || 'Raw Material';
          const info = parsePreformInfo(rawName);
          const qtyKg = Number(c.quantityUsed || 0);
          const qtyGrams = qtyKg * 1000;

          if (consumptionMap[info.id]) {
            consumptionMap[info.id].grams += qtyGrams;
            consumptionMap[info.id].kg += qtyKg;
            overallGrams += qtyGrams;
          }
        });
      }

      // 2. Extract produced bottle quantities to attribute bottles & fallback consumptions
      let batchProduced = [];
      if (batch.remarks) {
        try {
          const parsed = JSON.parse(batch.remarks);
          if (Array.isArray(parsed.producedItems)) {
            batchProduced = parsed.producedItems.map(p => ({
              name: p.name || '',
              quantity: Number(p.quantity || 0)
            }));
          }
        } catch (_err) {
          // Ignore invalid JSON
        }
      }

      if (batchProduced.length === 0) {
        if (batch.outputItem?.name) {
          batchProduced.push({
            name: batch.outputItem.name,
            quantity: Number(batch.quantity || 0)
          });
        } else {
          // Legacy Wadaana batch fields
          if (batch.qtyPure05L > 0) batchProduced.push({ name: '0.5L Pure Blue', quantity: batch.qtyPure05L });
          if (batch.qtyPure15L > 0) batchProduced.push({ name: '1.5L Pure Blue', quantity: batch.qtyPure15L });
          if (batch.qtyMix05L > 0) batchProduced.push({ name: '0.5L Mix Blue', quantity: batch.qtyMix05L });
          if (batch.qtyMix15L > 0) batchProduced.push({ name: '1.5L Mix Blue', quantity: batch.qtyMix15L });
        }
      }

      // Match produced items to preforms
      const hasExplicitConsumptions = Array.isArray(batch.consumptions) && batch.consumptions.length > 0;

      batchProduced.forEach(prod => {
        const info = parsePreformInfo(prod.name);
        const qty = Number(prod.quantity || 0);
        overallBottles += qty;

        if (consumptionMap[info.id]) {
          consumptionMap[info.id].bottles += qty;

          // If batch lacked explicit consumptions, calculate from standard recipe
          if (!hasExplicitConsumptions) {
            const addedGrams = qty * info.gramsPerBottle;
            const addedKg = addedGrams / 1000;
            consumptionMap[info.id].grams += addedGrams;
            consumptionMap[info.id].kg += addedKg;
            overallGrams += addedGrams;
          }
        }
      });
    });

    return {
      preforms: Object.values(consumptionMap),
      totalBottles: overallBottles,
      totalGrams: overallGrams,
      totalKg: overallGrams / 1000
    };
  }, [batches]);

  if (!isWadaana) {
    return null;
  }

  const { preforms, totalBottles, totalGrams, totalKg } = summary;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border-b border-sky-100 px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-700">
              <Flame size={20} className="text-sky-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Today's Preform Consumption</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  Wadaana Gram Tracking
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time gram-level consumption across all 6 preform types
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-sky-100 shadow-2xs">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total Consumed</div>
              <div className="text-sm font-black text-slate-900">
                {totalGrams.toLocaleString()}g{' '}
                <span className="text-xs font-mono font-normal text-slate-500">
                  ({totalKg.toFixed(2)} kg)
                </span>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-sky-100 shadow-2xs">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total Output</div>
              <div className="text-sm font-black text-slate-900">
                {totalBottles.toLocaleString()} <span className="text-xs font-normal text-slate-500">bottles</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Preform Cards Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {preforms.map(p => {
          const rate = p.bottles > 0
            ? (p.grams / p.bottles).toFixed(1)
            : p.gramsPerBottle;

          return (
            <div
              key={p.id}
              className={`p-4 rounded-xl border transition-all shadow-2xs ${p.bgClass}`}
            >
              {/* Card Header & Badges */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate" title={p.name}>
                    {p.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.badgeTypeClass}`}>
                      {p.type}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                      {p.size}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                      {p.color}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="space-y-2 pt-1 border-t border-slate-200/60">
                {/* 1. Grams Consumed & KG equivalent */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Flame size={13} className="text-orange-500" />
                    <span className="font-semibold">Consumed:</span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-base text-slate-900">
                      {p.grams.toLocaleString()}g
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono font-medium">
                      ({p.kg.toFixed(3).replace(/\.?0+$/, '')} kg)
                    </div>
                  </div>
                </div>

                {/* 2. Bottles Produced */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Package size={13} className="text-slate-500" />
                    <span className="font-semibold">Bottles Produced:</span>
                  </div>
                  <div className="font-bold text-slate-900 font-mono">
                    {p.bottles.toLocaleString()}
                  </div>
                </div>

                {/* 3. Gram-per-Bottle Rate */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Scale size={13} className="text-slate-500" />
                    <span className="font-semibold">Rate:</span>
                  </div>
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <TrendingUp size={11} className="text-slate-400" />
                    <span>{rate}g / bottle</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

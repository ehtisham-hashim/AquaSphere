import { useState } from 'react';
import { Factory, Trash2, CheckCircle2, AlertCircle, X, Package, Flame, Clock, UserCheck, Eye } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../common/TablePagination';
import { parsePreformInfo } from '../../utils/preformHelper';

function getBatchConsumptions(b, isWadaana) {
  if (!b) return [];
  if (Array.isArray(b.consumptions) && b.consumptions.length > 0) {
    return b.consumptions.map(c => {
      const rawName = c.item?.name || 'Raw Material';
      const unit = c.item?.unit || 'pcs';
      const qty = Number(c.quantityUsed || 0);

      if (isWadaana) {
        const info = parsePreformInfo(rawName);
        const qtyGrams = unit === 'kg' ? qty * 1000 : qty;
        return {
          name: rawName,
          unit,
          qty,
          isPreform: true,
          info,
          qtyKg: unit === 'kg' ? qty : qty / 1000,
          qtyGrams
        };
      }

      // AquaSphere - format according to unit
      const isCountable = unit === 'bottle' || unit === 'cap' || unit === 'pcs' || unit === 'unit';
      return {
        name: rawName,
        unit,
        qty,
        isCountable,
        displayQty: isCountable ? `${Math.round(qty).toLocaleString()} ${unit}` : `${qty.toFixed(3).replace(/\.?0+$/, '')} ${unit}`
      };
    });
  }

  if (isWadaana) {
    const products = getBatchProducts(b, isWadaana);
    return products.map(p => {
      const info = parsePreformInfo(p.name);
      const qty = parseInt(String(p.qty).replace(/[^0-9]/g, ''), 10) || 0;
      const qtyGrams = qty * info.gramsPerBottle;
      const qtyKg = qtyGrams / 1000;
      return {
        name: info.name,
        isPreform: true,
        info,
        qtyKg,
        qtyGrams
      };
    }).filter(c => c.qtyGrams > 0);
  }

  return [];
}

function getColorClasses(color) {
  switch (color) {
    case 'cyan':
    case 'sky': 
      return 'bg-sky-50 border-sky-200 text-sky-900';
    case 'amber':
    case 'orange': 
      return 'bg-amber-50 border-amber-200 text-amber-900';
    case 'purple': 
      return 'bg-purple-50 border-purple-200 text-purple-900';
    case 'blue': 
      return 'bg-blue-50 border-blue-200 text-blue-900';
    case 'emerald':
    default:
      return 'bg-emerald-50 border-emerald-200 text-emerald-900';
  }
}

function getBatchProducts(b, isWadaana) {
  if (b.remarks) {
    try {
      const parsed = JSON.parse(b.remarks);
      if (Array.isArray(parsed.producedItems) && parsed.producedItems.length > 0) {
        const colors = ['emerald', 'purple', 'blue', 'cyan', 'sky', 'amber', 'orange'];
        return parsed.producedItems.map((p, idx) => {
          const nameLower = (p.name || '').toLowerCase();
          const packSize = Number(p.packSize) > 1 
            ? Number(p.packSize) 
            : (nameLower.includes('0.5') ? 12 : (nameLower.includes('1.5') ? 6 : 1));
          const isPet = !isWadaana && (packSize > 1 || p.unit?.toLowerCase() === 'pets' || p.unit?.toLowerCase() === 'packs' || nameLower.includes('pet'));

          let qtyLabel;
          if (isPet) {
            const pets = Number(p.quantity) || 0;
            const totalBottles = p.totalBottles || (pets * packSize);
            qtyLabel = `${pets.toLocaleString()} PETs (${totalBottles.toLocaleString()} btl)`;
          } else {
            qtyLabel = `${Number(p.quantity).toLocaleString()} ${p.unit || 'bottles'}`;
          }

          return {
            name: p.name,
            qty: qtyLabel,
            color: colors[idx % colors.length]
          };
        });
      }
    } catch (_err) {
      // Ignore invalid JSON
    }
  }

  if (b.outputItem || b.outputItemId) {
    return [
      {
        name: b.outputItem?.name || 'Custom Product',
        qty: `${b.quantity?.toLocaleString()} ${b.outputItem?.unit || (isWadaana ? 'bottles' : 'units')}`,
        color: isWadaana ? 'sky' : 'emerald'
      }
    ];
  }

  if (isWadaana) {
    const list = [];
    if (b.qtyPure05L > 0) list.push({ name: '0.5L Pure', qty: `${b.qtyPure05L.toLocaleString()} pcs`, color: 'cyan' });
    if (b.qtyPure15L > 0) list.push({ name: '1.5L Pure', qty: `${b.qtyPure15L.toLocaleString()} pcs`, color: 'sky' });
    if (b.qtyMix05L > 0) list.push({ name: '0.5L Mix', qty: `${b.qtyMix05L.toLocaleString()} pcs`, color: 'amber' });
    if (b.qtyMix15L > 0) list.push({ name: '1.5L Mix', qty: `${b.qtyMix15L.toLocaleString()} pcs`, color: 'orange' });
    return list;
  }

  // AquaSphere standard fallback
  const list = [];
  if (b.packs05L > 0) list.push({ name: '0.5L PET', qty: `${b.packs05L.toLocaleString()} PETs (${(b.packs05L * 12).toLocaleString()} btl)`, color: 'emerald' });
  if (b.packs15L > 0) list.push({ name: '1.5L PET', qty: `${b.packs15L.toLocaleString()} PETs (${(b.packs15L * 6).toLocaleString()} btl)`, color: 'purple' });
  if (b.quantity > 0) list.push({ name: '19L Refill', qty: `${b.quantity.toLocaleString()} bottles`, color: 'blue' });
  return list;
}

function getTotalOutputText(b, isWadaana) {
  if (b.remarks) {
    try {
      const parsed = JSON.parse(b.remarks);
      if (Array.isArray(parsed.producedItems) && parsed.producedItems.length > 0) {
        if (!isWadaana) {
          let totalPets = 0;
          let totalBottles = 0;
          let hasPets = false;
          let hasBottlesOnly = false;

          for (const p of parsed.producedItems) {
            const nameLower = (p.name || '').toLowerCase();
            const packSize = Number(p.packSize) > 1 
              ? Number(p.packSize) 
              : (nameLower.includes('0.5') ? 12 : (nameLower.includes('1.5') ? 6 : 1));
            const isPet = packSize > 1 || p.unit?.toLowerCase() === 'pets' || p.unit?.toLowerCase() === 'packs' || nameLower.includes('pet');

            if (isPet) {
              hasPets = true;
              const pets = Number(p.quantity) || 0;
              totalPets += pets;
              totalBottles += (p.totalBottles || (pets * packSize));
            } else {
              hasBottlesOnly = true;
              const bottles = Number(p.quantity) || 0;
              totalBottles += bottles;
            }
          }

          if (hasPets && hasBottlesOnly) {
            return `${totalPets.toLocaleString()} PETs + ${totalBottles.toLocaleString()} Total Bottles`;
          }
          if (hasPets) {
            return `${totalPets.toLocaleString()} PETs (${totalBottles.toLocaleString()} Bottles)`;
          }
          return `${totalBottles.toLocaleString()} Bottles`;
        }

        // Wadaana
        if (parsed.producedItems.length === 1) {
          return `${parsed.producedItems[0].quantity?.toLocaleString()} ${parsed.producedItems[0].unit || 'Units'}`;
        }
        const byUnit = {};
        for (const p of parsed.producedItems) {
          const u = (p.unit || 'units').toLowerCase();
          byUnit[u] = (byUnit[u] || 0) + (Number(p.quantity) || 0);
        }
        return Object.entries(byUnit).map(([unit, q]) => `${q.toLocaleString()} ${unit.charAt(0).toUpperCase() + unit.slice(1)}`).join(' + ');
      }
    } catch (_err) {
      // Ignore invalid JSON
    }
  }

  if (b.outputItem || b.outputItemId) {
    return `${b.quantity?.toLocaleString()} ${b.outputItem?.unit || (isWadaana ? 'Bottles' : 'Packs')}`;
  }
  if (isWadaana) {
    const total = (b.qtyPure05L || 0) + (b.qtyPure15L || 0) + (b.qtyMix05L || 0) + (b.qtyMix15L || 0);
    return `${total.toLocaleString()} Bottles`;
  }
  const p05 = b.packs05L || 0;
  const p15 = b.packs15L || 0;
  const qty = b.quantity || 0;
  const pets = p05 + p15;
  const totalBottles = (p05 * 12) + (p15 * 6) + qty;
  if (pets > 0 && qty > 0) return `${pets.toLocaleString()} PETs + ${qty.toLocaleString()} Bottles (${totalBottles.toLocaleString()} Total Bottles)`;
  if (pets > 0) return `${pets.toLocaleString()} PETs (${totalBottles.toLocaleString()} Bottles)`;
  return `${qty.toLocaleString()} Bottles`;
}

function getTotalWaste(b) {
  if (!b) return 0;
  if (b.remarks) {
    try {
      const parsed = JSON.parse(b.remarks);
      if (parsed?.lossDetails?.totalWaste !== undefined) {
        return Number(parsed.lossDetails.totalWaste) || 0;
      }
    } catch {
      // ignore invalid json
    }
  }
  if (b.wasteQuantity !== undefined && b.wasteQuantity !== null && Number(b.wasteQuantity) > 0) {
    return Number(b.wasteQuantity);
  }
  const b05 = b.brokenBottles05L || 0;
  const b15 = b.brokenBottles15L || 0;
  const bp05 = b.brokenPure05L || 0;
  const bp15 = b.brokenPure15L || 0;
  const bm05 = b.brokenMix05L || 0;
  const bm15 = b.brokenMix15L || 0;
  return b05 + b15 + bp05 + bp15 + bm05 + bm15;
}

export default function ProductionBatchTable({
  batches,
  isWadaana,
  isOwner,
  user,
  onComplete,
  onDelete
}) {
  const [viewingBatch, setViewingBatch] = useState(null);
  const pagination = usePagination(batches || [], 50);

  return (
    <div className="table-container">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Factory className="w-4 h-4 text-brand" />
            Production History
          </h3>
        </div>
        <span className="text-xs font-medium text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
          Total Batches: <strong className="text-slate-900 font-bold">{batches.length}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead>
            <tr>
              <th className="table-th">Batch ID & Date</th>
              <th className="table-th">Produced Product & Breakdown</th>
              <th className="table-th">Waste / Loss</th>
              <th className="table-th">Status</th>
              <th className="table-th">Recorded By</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No production batches recorded.
                </td>
              </tr>
            ) : (
              pagination.paginatedItems.map(b => {
                const products = getBatchProducts(b, isWadaana);
                const visibleProducts = products.slice(0, 2);
                const remainingCount = products.length - 2;
                const wasteCount = getTotalWaste(b);

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                    {/* 1. Batch ID & Date */}
                    <td className="table-td">
                      <span className="font-mono font-bold text-xs text-brand block">
                        #{b.id.substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        {new Date(b.createdAt).toLocaleDateString()} <span className="text-slate-400">at {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </td>

                    {/* 2. Produced Product */}
                    <td className="table-td">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {visibleProducts.map((p, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setViewingBatch(b)}
                            title="Click to view full batch details & consumptions"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-2xs hover:opacity-85 transition cursor-pointer text-left ${getColorClasses(p.color)}`}
                          >
                            <span className="font-semibold">{p.name}:</span>
                            <span className="font-bold">{p.qty}</span>
                          </button>
                        ))}
                        {remainingCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setViewingBatch(b)}
                            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition border border-slate-200"
                            title="View all products produced in this batch"
                          >
                            +{remainingCount} more
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 3. Waste / Loss */}
                    <td className="table-td">
                      {wasteCount > 0 ? (
                        <span className="badge-danger text-xs font-semibold">
                          <AlertCircle size={12} />
                          {wasteCount} waste
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Clean
                        </span>
                      )}
                    </td>

                    {/* 4. Status */}
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        {b.status === 'COMPLETED' ? (
                          <span className="badge-success text-xs">
                            <CheckCircle2 size={12} />
                            Completed
                          </span>
                        ) : (
                          <>
                            <span className="badge-warning text-xs">
                              <Clock size={12} />
                              Pending
                            </span>
                            {(isOwner || user?.role === 'PRODUCTION_MANAGER') && (
                              <button
                                onClick={() => onComplete(b.id)}
                                className="btn-primary text-xs py-1 px-2.5"
                              >
                                Confirm
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* 5. Recorded By */}
                    <td className="table-td">
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 block">{b.createdBy?.name || 'System'}</span>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider">{b.createdBy?.role ? b.createdBy.role.replace(/_/g, ' ') : 'Staff'}</span>
                      </div>
                    </td>

                    {/* 6. Actions (Inspect for all, Delete for Owner) */}
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingBatch(b)}
                          title="Inspect Batch Details & Consumptions"
                          className="p-1 rounded-md text-slate-500 hover:text-brand hover:bg-slate-100 transition cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => onDelete(b)}
                            title="Delete Batch (Owner Only)"
                            className="btn-danger text-xs p-1"
                          >
                            <Trash2 size={13} />
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
      </div>
      <TablePagination pagination={pagination} />

      {/* Batch Details Modal (Opened by Eye Icon or "+X more") */}
      {viewingBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[75] animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className={`px-5 py-4 border-b flex justify-between items-center text-white ${
              isWadaana ? 'bg-gradient-to-r from-sky-600 to-blue-700' : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/15">
                  {isWadaana ? <Flame size={18} /> : <Package size={18} className="text-white" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm">Batch #{viewingBatch.id.substring(0, 8).toUpperCase()} Details</h4>
                  <p className="text-[11px] text-white/80">{new Date(viewingBatch.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingBatch(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-slate-500" />
                  <span className="font-bold text-slate-700">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    viewingBatch.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {viewingBatch.status === 'COMPLETED' ? 'Completed' : 'Pending Verification'}
                  </span>
                </div>
                <div className="text-slate-500">
                  Total: <strong className="text-slate-900">{getTotalOutputText(viewingBatch, isWadaana)}</strong>
                </div>
              </div>

              {/* Complete List of Produced Products */}
              <div>
                <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                  Produced Finished Goods
                </h5>
                <div className="space-y-1.5">
                  {getBatchProducts(viewingBatch, isWadaana).map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs"
                    >
                      <span className="font-bold text-slate-800">{p.name}</span>
                      <span className="font-black text-slate-900">{p.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consumed Raw Materials */}
              {(() => {
                const consumptionsList = getBatchConsumptions(viewingBatch, isWadaana);
                if (consumptionsList.length === 0) return null;

                return (
                  <div>
                    <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                      <Flame size={13} className="text-orange-500" />
                      Raw Material Consumptions {isWadaana ? '(Preforms)' : ''}
                    </h5>
                    <div className="space-y-1.5">
                      {consumptionsList.map((c, idx) => {
                        if (isWadaana && c.info) {
                          const { info, qtyKg, qtyGrams } = c;
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border flex items-center justify-between shadow-2xs ${info.bgClass || 'bg-slate-50 border-slate-300'}`}
                            >
                              <div className="flex-1 min-w-0 pr-3">
                                <span className="font-bold text-slate-900 block text-xs truncate">{c.name}</span>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${info.badgeTypeClass}`}>
                                    {info.type}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                                    {info.size}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                                    {info.color}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-black text-slate-900 text-sm sm:text-base">
                                  {qtyGrams.toLocaleString()}g
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  ({qtyKg.toFixed(3).replace(/\.?0+$/, '')} kg)
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // AquaSphere clean display
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between shadow-2xs"
                          >
                            <span className="font-bold text-slate-800">{c.name}</span>
                            <span className="font-black text-slate-900 font-mono">{c.displayQty}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Scrap & Breakage Details */}
              {(() => {
                let lossDetails = null;
                try {
                  if (viewingBatch.remarks) {
                    const parsed = JSON.parse(viewingBatch.remarks);
                    lossDetails = parsed.lossDetails || null;
                  }
                } catch {
                  // Ignore invalid JSON
                }

                const wasteCount = getTotalWaste(viewingBatch);
                const wasteItems = lossDetails?.wasteItems || [];

                if (wasteCount === 0 && wasteItems.length === 0) return null;

                return (
                  <div>
                    <h5 className="font-bold text-rose-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-rose-600" />
                      Scrap & Material Lost in Breakage ({wasteCount} broken bottles)
                    </h5>
                    {wasteItems.length > 0 ? (
                      <div className="space-y-1.5">
                        {wasteItems.map((w, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between shadow-2xs"
                          >
                            <span className="font-semibold text-rose-900">{w.name}</span>
                            <span className="font-bold font-mono text-rose-700">
                              {w.unit === 'bottle' || w.unit === 'cap' || w.unit === 'pcs' || w.unit === 'unit'
                                ? `${Math.round(w.quantityLost).toLocaleString()} ${w.unit}`
                                : `${Number(w.quantityLost).toFixed(3).replace(/\.?0+$/, '')} ${w.unit}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
                        {wasteCount} bottle{wasteCount > 1 ? 's' : ''} damaged / lost during production run.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Scrap Summary & Audit Trail */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Breakage</span>
                  <span className="font-black text-slate-800 text-sm mt-0.5 block">
                    {getTotalWaste(viewingBatch)} bottles
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Recorded By</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block flex items-center gap-1">
                    <UserCheck size={12} className="text-slate-500" />
                    {viewingBatch.createdBy?.name || 'System'}
                  </span>
                </div>
              </div>

              {viewingBatch.notes && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900">
                  <span className="font-bold block text-[10px] uppercase">Notes:</span>
                  <p className="mt-0.5">{viewingBatch.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setViewingBatch(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

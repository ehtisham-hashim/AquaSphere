import { useState } from 'react';
import { Factory, Trash2, CheckCircle2, AlertCircle, X, Package, Flame, Clock, UserCheck } from 'lucide-react';

function getColorClasses(color) {
  switch (color) {
    case 'cyan': return 'bg-cyan-50 border border-cyan-200 text-cyan-800';
    case 'sky': return 'bg-sky-50 border border-sky-200 text-sky-800';
    case 'amber': return 'bg-amber-50 border border-amber-200 text-amber-800';
    case 'orange': return 'bg-orange-50 border border-orange-200 text-orange-800';
    case 'purple': return 'bg-purple-50 border border-purple-200 text-purple-800';
    case 'blue': return 'bg-blue-50 border border-blue-200 text-blue-800';
    case 'emerald':
    default:
      return 'bg-emerald-50 border border-emerald-200 text-emerald-800';
  }
}

function getBatchProducts(b, isWadaana) {
  if (b.outputItem || b.outputItemId) {
    return [
      {
        name: b.outputItem?.name || 'Custom Product',
        qty: `+${b.quantity?.toLocaleString()} ${b.outputItem?.unit || (isWadaana ? 'bottles' : 'units')}`,
        color: isWadaana ? 'sky' : 'emerald'
      }
    ];
  }

  if (isWadaana) {
    const list = [];
    if (b.qtyPure05L > 0) list.push({ name: '0.5L Pure', qty: `+${b.qtyPure05L.toLocaleString()} pcs`, color: 'cyan' });
    if (b.qtyPure15L > 0) list.push({ name: '1.5L Pure', qty: `+${b.qtyPure15L.toLocaleString()} pcs`, color: 'sky' });
    if (b.qtyMix05L > 0) list.push({ name: '0.5L Mix', qty: `+${b.qtyMix05L.toLocaleString()} pcs`, color: 'amber' });
    if (b.qtyMix15L > 0) list.push({ name: '1.5L Mix', qty: `+${b.qtyMix15L.toLocaleString()} pcs`, color: 'orange' });
    return list;
  }

  // AquaSphere standard
  const list = [];
  if (b.packs05L > 0) list.push({ name: '0.5L PET', qty: `+${b.packs05L.toLocaleString()} packs (${(b.packs05L * 12).toLocaleString()} PETs)`, color: 'emerald' });
  if (b.packs15L > 0) list.push({ name: '1.5L PET', qty: `+${b.packs15L.toLocaleString()} packs (${(b.packs15L * 6).toLocaleString()} PETs)`, color: 'purple' });
  if (b.quantity > 0) list.push({ name: '19L Refill', qty: `+${b.quantity.toLocaleString()} bottles`, color: 'blue' });
  return list;
}

function getTotalOutputText(b, isWadaana) {
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
  const packs = p05 + p15;
  if (packs > 0 && qty > 0) return `${packs.toLocaleString()} Packs + ${qty.toLocaleString()} Bottles`;
  if (packs > 0) return `${packs.toLocaleString()} Packs`;
  return `${qty.toLocaleString()} Bottles`;
}

function getTotalWaste(b) {
  if (b.outputItem || b.outputItemId) {
    return b.wasteQuantity || 0;
  }
  const b05 = b.brokenBottles05L || 0;
  const b15 = b.brokenBottles15L || 0;
  const w19 = b.wasteQuantity || 0;
  return b05 + b15 + w19;
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Factory className="w-5 h-5 text-slate-600" />
            Production History & Batch Audit Trail
          </h3>
          <p className="text-xs text-slate-500">Read-only audit log of past production runs</p>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
          Total Batches: {batches.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Batch ID & Date</th>
              <th className="p-3.5">Produced Product & Breakdown</th>
              <th className="p-3.5">Total Output</th>
              <th className="p-3.5">Waste / Loss</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Recorded By</th>
              {isOwner && <th className="p-3.5 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.length === 0 ? (
              <tr>
                <td colSpan={isOwner ? 7 : 6} className="p-8 text-center text-slate-400">
                  No production batches recorded.
                </td>
              </tr>
            ) : (
              batches.map(b => {
                const products = getBatchProducts(b, isWadaana);
                const visibleProducts = products.slice(0, 2);
                const remainingCount = products.length - 2;
                const totalOutput = getTotalOutputText(b, isWadaana);
                const wasteCount = getTotalWaste(b);

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    {/* 1. Batch ID & Date */}
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-slate-800 block">
                        #{b.id.substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {new Date(b.createdAt).toLocaleString()}
                      </span>
                    </td>

                    {/* 2. Produced Product (Max 2 + more badge, clickable to view details) */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {visibleProducts.map((p, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setViewingBatch(b)}
                            title="Click to view full batch details & consumptions"
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs shadow-2xs hover:opacity-85 transition cursor-pointer text-left ${getColorClasses(p.color)}`}
                          >
                            {p.name}: {p.qty}
                          </button>
                        ))}
                        {remainingCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setViewingBatch(b)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition border border-slate-200 shadow-2xs"
                            title="View all products produced in this batch"
                          >
                            +{remainingCount} more
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 3. Total Output */}
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800">
                        {totalOutput}
                      </span>
                    </td>

                    {/* 4. Waste / Loss */}
                    <td className="p-3.5">
                      {wasteCount > 0 ? (
                        <span className="text-rose-600 font-bold text-xs bg-rose-50 border border-rose-200 px-2 py-1 rounded-md inline-flex items-center gap-1">
                          <AlertCircle size={12} />
                          {wasteCount} waste
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold">Clean</span>
                      )}
                    </td>

                    {/* 5. Status & Actions */}
                    <td className="p-3.5 text-xs">
                      <div className="flex items-center gap-2">
                        {b.status === 'COMPLETED' ? (
                          <span className="px-2.5 py-1 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 size={12} />
                            Completed
                          </span>
                        ) : (
                          <>
                            <span className="px-2.5 py-1 rounded-full text-amber-800 bg-amber-50 border border-amber-200 font-bold text-xs">
                              Pending Verification
                            </span>
                            {(isOwner || user?.role === 'PRODUCTION_MANAGER') && (
                              <button
                                onClick={() => onComplete(b.id)}
                                className={`px-2.5 py-1 text-white rounded-lg text-xs font-bold transition shadow-sm ${
                                  isWadaana ? 'bg-[#0ea5e9] hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'
                                }`}
                              >
                                Confirm & Complete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* 6. Recorded By */}
                    <td className="p-3.5 text-xs text-slate-600 font-medium">
                      {b.createdBy?.name || 'System'} ({b.createdBy?.role || 'MM'})
                    </td>

                    {/* 7. Delete (Owner Only) */}
                    {isOwner && (
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => onDelete(b)}
                          title="Delete Batch (Owner Only)"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Batch Details Modal (Opened by Eye Icon or "+X more") */}
      {viewingBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[75] animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className={`px-5 py-4 border-b flex justify-between items-center text-white ${
              isWadaana ? 'bg-gradient-to-r from-sky-600 to-blue-700' : 'bg-gradient-to-r from-slate-900 to-slate-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/10">
                  {isWadaana ? <Flame size={18} /> : <Package size={18} className="text-emerald-400" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm">Batch #{viewingBatch.id.substring(0, 8).toUpperCase()} Details</h4>
                  <p className="text-[11px] text-slate-200">{new Date(viewingBatch.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingBatch(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
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
                  All Produced Items
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

              {/* Consumed Raw Materials (If Dynamic Recipe or Consumptions) */}
              {viewingBatch.consumptions && viewingBatch.consumptions.length > 0 && (
                <div>
                  <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                    Raw Material Consumptions
                  </h5>
                  <div className="space-y-1.5">
                    {viewingBatch.consumptions.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-700">{c.item?.name || 'Raw Material'}</span>
                        <span className="font-bold text-slate-900">{c.quantityUsed} {c.item?.unit || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrap & Audit Trail */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Scrap / Waste</span>
                  <span className="font-black text-slate-800 text-sm mt-0.5 block">
                    {getTotalWaste(viewingBatch)} units
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

import { Factory, Trash2 } from 'lucide-react';

export default function ProductionBatchTable({
  batches,
  isWadaana,
  isOwner,
  user,
  onComplete,
  onDelete
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-3.5">Batch ID & Date</th>
              {!isWadaana ? (
                <>
                  <th className="p-3.5">Output (0.5L Packs)</th>
                  <th className="p-3.5">Output (1.5L Packs)</th>
                  <th className="p-3.5">Output (19L)</th>
                  <th className="p-3.5">Total Water Treated</th>
                </>
              ) : (
                <>
                  <th className="p-3.5">0.5L Pure</th>
                  <th className="p-3.5">1.5L Pure</th>
                  <th className="p-3.5">0.5L Mix</th>
                  <th className="p-3.5">1.5L Mix</th>
                  <th className="p-3.5">Total Output</th>
                </>
              )}
              {!isWadaana && <th className="p-3.5">Breakage / Waste</th>}
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Recorded By</th>
              {isOwner && <th className="p-3.5 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.length === 0 ? (
              <tr>
                <td colSpan={isOwner ? 9 : 8} className="p-8 text-center text-slate-400">
                  No production batches recorded.
                </td>
              </tr>
            ) : (
              batches.map(b => {
                if (isWadaana) {
                  const p05 = b.qtyPure05L || 0;
                  const p15 = b.qtyPure15L || 0;
                  const m05 = b.qtyMix05L || 0;
                  const m15 = b.qtyMix15L || 0;
                  const totalBottles = p05 + p15 + m05 + m15;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-800">#{b.id.substring(0, 8).toUpperCase()}</span>
                        <span className="text-xs text-slate-400 block">{new Date(b.createdAt).toLocaleString()}</span>
                      </td>
                      <td className="p-3.5 font-bold text-cyan-600">+{p05} pcs</td>
                      <td className="p-3.5 font-bold text-sky-600">+{p15} pcs</td>
                      <td className="p-3.5 font-bold text-amber-600">+{m05} pcs</td>
                      <td className="p-3.5 font-bold text-orange-600">+{m15} pcs</td>
                      <td className="p-3.5 font-bold text-slate-800">{totalBottles.toLocaleString()} Bottles</td>
                      <td className="p-3.5 text-xs">
                        {b.status === 'COMPLETED' ? (
                          <span className="px-2 py-1 rounded text-emerald-700 bg-emerald-50 border border-emerald-200 font-medium">Completed</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded text-amber-700 bg-amber-50 border border-amber-200 font-medium">Pending</span>
                            <button
                              onClick={() => onComplete(b.id)}
                              className="px-2 py-1 bg-[#0ea5e9] text-white rounded text-xs hover:bg-sky-500 font-medium transition shadow-sm"
                            >
                              Confirm & Complete
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-slate-600 font-medium">
                        {b.createdBy?.name || user?.name || 'System'} ({b.createdBy?.role || 'MM'})
                      </td>
                      {isOwner && (
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => onDelete(b)}
                            title="Delete Batch (Owner Only)"
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                }

                const p05 = b.packs05L || 0;
                const p15 = b.packs15L || 0;
                const qty = b.quantity || 0;
                const litres = (p05 * 9) + (p15 * 12) + (qty * 24);
                const b05 = b.brokenBottles05L || 0;
                const b15 = b.brokenBottles15L || 0;
                const w19 = b.wasteQuantity || 0;

                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-slate-800">#{b.id.substring(0, 8).toUpperCase()}</span>
                      <span className="text-xs text-slate-400 block">{new Date(b.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="p-3.5 font-bold text-emerald-600">+{p05} packs</td>
                    <td className="p-3.5 font-bold text-purple-600">+{p15} packs</td>
                    <td className="p-3.5 font-bold text-blue-600">+{qty} bottles</td>
                    <td className="p-3.5 font-mono font-medium text-slate-700">{litres} Litres</td>
                    <td className="p-3.5">
                      {(b05 > 0 || b15 > 0 || w19 > 0) ? (
                        <span className="text-rose-600 font-semibold text-xs bg-rose-50 px-2 py-1 rounded-md" title={`0.5L: ${b05} | 1.5L: ${b15} | 19L: ${w19}`}>
                          {b05 + b15 + w19} broken/waste ({b05 ? `${b05}x0.5L ` : ''}{b15 ? `${b15}x1.5L ` : ''}{w19 ? `${w19}x19L` : ''})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Clean</span>
                      )}
                    </td>
                    <td className="p-3.5 text-xs">
                      {b.status === 'COMPLETED' ? (
                        <div className="space-y-0.5">
                          <span className="px-2.5 py-0.5 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1">
                            ✓ Completed
                          </span>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">
                            Verified By: <span className="text-slate-800 font-bold">{b.completedBy?.name || user?.name || 'Admin'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            Verified On: {new Date(b.updatedAt || b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full text-amber-800 bg-amber-50 border border-amber-200 font-bold text-xs">Pending Verification</span>
                          <button
                            onClick={() => onComplete(b.id)}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-500 font-medium transition shadow-sm"
                          >
                            Confirm & Complete
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-xs text-slate-600 font-medium">
                      {b.createdBy?.name || user?.name || 'System'} ({b.createdBy?.role || 'MM'})
                    </td>
                    {isOwner && (
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => onDelete(b)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Batch (Owner)"
                        >
                          <Trash2 size={16} />
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
    </div>
  );
}

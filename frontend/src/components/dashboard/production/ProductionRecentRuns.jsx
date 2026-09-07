import { Link } from 'react-router-dom';
import { Factory, ChevronRight } from 'lucide-react';

export default function ProductionRecentRuns({ recentBatches, isWadaana }) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Factory size={15} className="text-brand-primary" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Recent Production Runs</h3>
        </div>
        <Link to="/production" className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-0.5">
          View All <ChevronRight size={14} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap text-xs">
          <thead>
            <tr>
              <th className="table-th">Batch ID</th>
              <th className="table-th">Output Produced</th>
              <th className="table-th">Waste/Breakage</th>
              <th className="table-th">Status</th>
              <th className="table-th">Logged By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {(!recentBatches || recentBatches.length === 0) ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">
                  No production runs logged today.
                </td>
              </tr>
            ) : (
              recentBatches.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono font-bold text-slate-800">{b.shortId}</td>
                  <td className="p-3 font-bold text-slate-900">
                    {isWadaana ? (
                      (() => {
                        const parts = [];
                        if (b.qtyPure05L > 0) parts.push(`Pure 0.5L (${b.qtyPure05L})`);
                        if (b.qtyPure15L > 0) parts.push(`Pure 1.5L (${b.qtyPure15L})`);
                        if (b.qtyMix05L > 0) parts.push(`Mix 0.5L (${b.qtyMix05L})`);
                        if (b.qtyMix15L > 0) parts.push(`Mix 1.5L (${b.qtyMix15L})`);

                        if (parts.length === 0) return <span className="text-slate-400 font-normal">0 bottles</span>;
                        if (parts.length === 1) return parts[0];

                        return (
                          <div className="flex items-center gap-1.5">
                            <span>{parts[0]}</span>
                            <span 
                              title={parts.slice(1).join(', ')} 
                              className="px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 cursor-help"
                            >
                              +{parts.length - 1}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      (() => {
                        const parts = [];
                        if (b.quantity > 0) parts.push(`${b.quantity} (19L)`);
                        if (b.packs15L > 0) parts.push(`${b.packs15L} pk (1.5L)`);
                        if (b.packs05L > 0) parts.push(`${b.packs05L} pk (0.5L)`);

                        if (parts.length === 0) return <span className="text-slate-400 font-normal">0 units</span>;
                        if (parts.length === 1) return parts[0];

                        return (
                          <div className="flex items-center gap-1.5">
                            <span>{parts[0]}</span>
                            <span 
                              title={parts.slice(1).join(', ')} 
                              className="px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 cursor-help"
                            >
                              +{parts.length - 1}
                            </span>
                          </div>
                        );
                      })()
                    )}
                  </td>
                  <td className="p-3 font-semibold text-rose-600">
                    {b.wasteQuantity > 0 ? `${b.wasteQuantity} units` : <span className="text-slate-400 font-normal">0</span>}
                  </td>
                  <td className="p-3">
                    {b.status === 'COMPLETED' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Completed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 font-medium">{b.createdBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

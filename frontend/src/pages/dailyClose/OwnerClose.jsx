import { useState, useEffect } from 'react';
import { getCompanyFromCookie } from '../../utils/companyCookie';
import { API_URL } from '../../utils/api';
import { ChevronDown, ChevronUp, Calendar, Box, Package, AlertTriangle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const API = API_URL;

export default function OwnerClose() {
  const tenant = getCompanyFromCookie();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/daily-close/history`, {
        headers: { 'x-tenant': tenant },
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        setHistory(json.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
        No finalized days found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((day) => {
        const isExpanded = expandedId === day.id;
        const p = day.productionTotals || {};
        
        return (
          <div key={day.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300">
            {/* Header (Clickable) */}
            <div 
              onClick={() => setExpandedId(isExpanded ? null : day.id)}
              className="p-5 cursor-pointer flex items-center justify-between bg-slate-50 hover:bg-slate-100/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shadow-inner">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <UserCheck size={14} className="text-emerald-600" />
                      Locked by {day.closedBy?.name || 'Admin'}
                    </span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>{new Date(day.closedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Quick Stats Summary */}
                <div className="hidden sm:flex items-center gap-4 text-sm font-semibold">
                  <div className="text-slate-600 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <Box size={16} className="text-blue-500"/>
                    {p.total19L || 0} <span className="text-slate-400 font-normal">19L</span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <Package size={16} className="text-indigo-500"/>
                    {(p.packs15L || 0) + (p.packs05L || 0)} <span className="text-slate-400 font-normal">Packs</span>
                  </div>
                </div>
                
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
              <div className="p-6 border-t border-slate-100 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Production Stats Detailed */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <Box size={16} className="text-slate-400"/>
                      Production Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">19L Bottles</p>
                        <p className="text-xl font-bold text-slate-800">{p.total19L || 0}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">1.5L Packs</p>
                        <p className="text-xl font-bold text-slate-800">{p.packs15L || 0}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">0.5L Packs</p>
                        <p className="text-xl font-bold text-slate-800">{p.packs05L || 0}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="text-xs text-red-600/70 mb-1 flex items-center gap-1">
                          <AlertTriangle size={12}/> Waste / Breakage
                        </p>
                        <p className="text-xl font-bold text-red-700">
                          {(p.waste19L || 0) + (p.broken15L || 0) + (p.broken05L || 0)}
                        </p>
                      </div>
                    </div>
                    {day.pmConfirmedBy && (
                       <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5">
                         <UserCheck size={14} className="text-emerald-600"/>
                         Confirmed by {day.pmConfirmedBy.name} at {new Date(day.pmConfirmedAt).toLocaleTimeString()}
                       </p>
                    )}
                  </div>

                  {/* Future Accounting & Sales Stats Placeholder */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Accounting Data</h4>
                      <div className="h-20 bg-slate-50 rounded-xl border border-slate-100 border-dashed flex items-center justify-center text-slate-400 text-sm">
                        Accounting module pending
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Sales Data</h4>
                      <div className="h-20 bg-slate-50 rounded-xl border border-slate-100 border-dashed flex items-center justify-center text-slate-400 text-sm">
                        Marketing Manager module pending
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

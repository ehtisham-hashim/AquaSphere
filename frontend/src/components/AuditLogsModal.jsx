import { useState, useEffect } from 'react';
import { X, Search, Filter } from 'lucide-react';
import { API_URL } from '../utils/api';

export default function AuditLogsModal({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_URL}/audit-logs`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setLogs(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch audit logs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchAction = filterAction ? log.action === filterAction : true;
    const searchString = `${log.entity} ${log.details} ${log.userName}`.toLowerCase();
    const matchSearch = searchQuery ? searchString.includes(searchQuery.toLowerCase()) : true;
    return matchAction && matchSearch;
  });

  const uniqueActions = [...new Set(logs.map(log => log.action))].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="card-surface w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] p-0 overflow-hidden">
        <div className="bg-slate-50/80 backdrop-blur-xs border-b border-slate-100 px-5 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-base font-bold text-slate-800">System Audit Logs</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-3.5 border-b border-slate-100 flex gap-3 shrink-0 bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="search"
              placeholder="Search logs..."
              className="input-base pl-8 text-xs py-1.5 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              className="select-base pl-8 text-xs py-1.5 w-full"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-y-auto p-0 flex-1">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs">Loading audit logs...</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 sticky top-0 shadow-xs border-b border-slate-200">
                <tr>
                  <th className="table-th">Timestamp</th>
                  <th className="table-th">Action</th>
                  <th className="table-th">Performed By</th>
                  <th className="table-th">Entity</th>
                  <th className="table-th">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length > 0 ? filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="table-td whitespace-nowrap font-mono text-xs text-slate-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="table-td">
                      <span className="badge-neutral text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="table-td font-semibold text-slate-800 text-xs">{log.userName || log.userId}</td>
                    <td className="table-td text-xs">{log.entity}</td>
                    <td className="table-td text-xs max-w-xs truncate" title={log.details}>{log.details}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 text-xs">No logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

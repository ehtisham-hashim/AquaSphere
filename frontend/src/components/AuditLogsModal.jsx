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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center rounded-t-2xl shrink-0">
          <h3 className="text-lg font-bold text-slate-800">System Audit Logs</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <div className="p-4 border-b border-slate-100 flex gap-4 shrink-0 bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative w-48">
            <Filter className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <select
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm appearance-none bg-white"
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
            <div className="p-8 text-center text-slate-500">Loading audit logs...</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 sticky top-0 shadow-sm">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Performed By</th>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length > 0 ? filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800">{log.userName || log.userId}</td>
                    <td className="px-6 py-3">{log.entity}</td>
                    <td className="px-6 py-3 max-w-xs truncate" title={log.details}>{log.details}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No logs found.</td>
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

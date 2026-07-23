import { useState, useEffect } from 'react';
import { Plus, X, Search, Receipt, DollarSign, Calendar } from 'lucide-react';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  const fetchExpenses = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/expenses`, { credentials: 'include' });
    const json = await res.json();
    if (json.success) setExpenses(json.data);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const addExpense = async (e) => {
    e.preventDefault();
    await fetch(`${import.meta.env.VITE_API_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, amount, receiptUrl }),
      credentials: 'include'
    });
    setCategory(''); setAmount(''); setReceiptUrl('');
    setIsModalOpen(false);
    fetchExpenses();
  };

  const filteredExpenses = expenses.filter(ex => ex.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Expenses</h2>
          <p className="text-slate-500 text-sm">Log daily operational cash outflows</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Log Expense
        </button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="search" 
          placeholder="Search by category..." 
          className="w-full border border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">Category</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Amount</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Date</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map(ex => (
                <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">{ex.category}</td>
                  <td className="p-4">
                     <span className="font-bold text-red-600">Rs. {ex.amount}</span>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">
                    <div className="flex items-center gap-2">
                       <Calendar size={16} className="text-slate-400"/>
                       {new Date(ex.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                     {ex.receiptUrl ? (
                       <a href={ex.receiptUrl} target="_blank" rel="noreferrer" className="text-red-600 hover:text-red-800 font-medium text-sm">View Receipt</a>
                     ) : (
                       <span className="text-slate-400 text-sm">None</span>
                     )}
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500">No expenses found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Log New Expense</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={addExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Category *</label>
                <input 
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  placeholder="e.g. Fuel, Utility, Wages"
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (Rs) *</label>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                   <input 
                     type="number" 
                     step="0.01" 
                     className="w-full border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" 
                     value={amount} 
                     onChange={(e) => setAmount(e.target.value)} 
                     required 
                   />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Receipt URL (Optional)</label>
                <div className="relative">
                   <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                   <input 
                     type="url" 
                     className="w-full border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" 
                     value={receiptUrl} 
                     onChange={(e) => setReceiptUrl(e.target.value)} 
                     placeholder="https://..."
                   />
                </div>
                {receiptUrl && (
                  <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden h-32 bg-slate-50 flex items-center justify-center">
                    <img 
                      src={receiptUrl} 
                      alt="Receipt Preview" 
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NDBhMWUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxsaW5lIHgxPSIxMiIgeTE9IjgiIHgyPSIxMiIgeTI9IjEyIi8+PGxpbmUgeDE9IjEyIiB5MT0iMTYiIHgyPSIxMi4wMSIgeTI9IjE2Ii8+PC9zdmc+';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                  Log Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

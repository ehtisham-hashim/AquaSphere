import { useState, useEffect } from 'react';
import { Plus, X, Search, DollarSign, Calendar, Droplets, CreditCard } from 'lucide-react';
import { API_URL } from '../utils/api';

export default function CounterSales() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [litresSold, setLitresSold] = useState('');
  const [capsIssued, setCapsIssued] = useState('0');
  const [cashCollected, setCashCollected] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [remarks, setRemarks] = useState('');

  const fetchSales = async () => {
    const res = await fetch(`${API_URL}/spot-sales`, { credentials: 'include' });
    const json = await res.json();
    if (json.success) setSales(json.data);
  };

  useEffect(() => { fetchSales(); }, []);

  const addSale = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/spot-sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ litresSold, capsIssued, cashCollected, paymentMethod, remarks }),
      credentials: 'include'
    });
    setLitresSold(''); setCapsIssued('0'); setCashCollected(''); setPaymentMethod('CASH'); setRemarks('');
    setIsModalOpen(false);
    fetchSales();
  };

  const filteredSales = sales.filter(s => 
    s.paymentMethod.toLowerCase().includes(search.toLowerCase()) || 
    (s.remarks && s.remarks.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Spot / Counter Sales</h2>
          <p className="text-slate-500 text-sm">Log walk-in retail sales to unregistered customers</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Log Walk-In Sale
        </button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="search" 
          placeholder="Search by payment method or remarks..." 
          className="w-full border border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm">Date</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Water Sold (L)</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Caps Issued</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Amount Collected</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Payment Method</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-800 font-medium">
                    <div className="flex items-center gap-2">
                       <Calendar size={16} className="text-slate-400"/>
                       {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </td>
                  <td className="p-4 text-sky-600 font-bold">{sale.litresSold} L</td>
                  <td className="p-4 text-slate-700">{sale.capsIssued}</td>
                  <td className="p-4 text-emerald-600 font-bold">Rs. {sale.cashCollected}</td>
                  <td className="p-4 text-slate-600">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-semibold">{sale.paymentMethod}</span>
                  </td>
                  <td className="p-4 text-slate-500 text-sm truncate max-w-[200px]">{sale.remarks || '-'}</td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No counter sales found.</td>
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
              <h3 className="text-lg font-bold text-slate-800">Log Walk-In Sale</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={addSale} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Litres Sold *</label>
                <div className="relative">
                   <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500" size={18}/>
                   <input 
                     type="number" 
                     step="0.1" 
                     className="w-full border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" 
                     value={litresSold} 
                     onChange={(e) => setLitresSold(e.target.value)} 
                     required 
                   />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Caps Issued</label>
                <input 
                  type="number" 
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" 
                  value={capsIssued} 
                  onChange={(e) => setCapsIssued(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Collected (Rs) *</label>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18}/>
                   <input 
                     type="number" 
                     step="0.01" 
                     className="w-full border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" 
                     value={cashCollected} 
                     onChange={(e) => setCashCollected(e.target.value)} 
                     required 
                   />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <div className="relative">
                   <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                   <select
                     className="w-full border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none bg-white"
                     value={paymentMethod}
                     onChange={(e) => setPaymentMethod(e.target.value)}
                   >
                     <option value="CASH">Cash</option>
                     <option value="BANK_TRANSFER">Bank Transfer</option>
                     <option value="MOBILE_WALLET">Mobile Wallet</option>
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)} 
                  placeholder="Optional details..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                  Save Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

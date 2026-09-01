import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export default function OrderSearch({ searchQuery, setSearchQuery }) {
  const [localVal, setLocalVal] = useState(searchQuery || '');
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalVal(searchQuery || '');
  }, [searchQuery]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalVal(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearchQuery(val);
    }, 250);
  };

  return (
    <div className="mb-6 relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      <input 
        type="search" 
        placeholder="Search by Order ID, Customer Name, or Phone Number..." 
        className="w-full border border-slate-200 bg-white rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 font-medium transition-all shadow-xs"
        value={localVal}
        onChange={handleChange}
      />
    </div>
  );
}

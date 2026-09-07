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
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input 
        type="search" 
        placeholder="Search by Order ID, Customer Name, or Phone Number..." 
        className="w-full border border-slate-200 bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 font-medium transition-all shadow-xs"
        value={localVal}
        onChange={handleChange}
      />
    </div>
  );
}

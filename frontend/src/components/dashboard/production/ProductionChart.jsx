import { BarChart3 } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export default function ProductionChart({
  chartData,
  selectedDays,
  setSelectedDays,
  isWadaana
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-slate-700" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Daily Production & Waste Chart</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 transition shadow-2xs cursor-pointer"
          >
            <option value="7">Past 7 Days</option>
            <option value="14">Past 14 Days</option>
            <option value="30">Past 30 Days</option>
          </select>
        </div>
      </div>

      <div className="w-full h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                border: 'none', 
                borderRadius: '12px', 
                color: '#fff', 
                fontSize: '11px', 
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                padding: '10px 14px'
              }}
              itemStyle={{ color: '#e2e8f0', fontSize: '11px', padding: '2px 0' }}
              labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
              cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 600 }} 
              iconType="circle"
            />
            {isWadaana ? (
              <>
                <Bar dataKey="Pure 0.5L" stackId="a" fill="#0284c7" isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="Pure 1.5L" stackId="a" fill="#0ea5e9" isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="Mix 0.5L" stackId="a" fill="#8b5cf6" isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="Mix 1.5L" stackId="a" fill="#a855f7" isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="Broken / Waste" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} />
              </>
            ) : (
              <>
                <Bar dataKey="19L Bottles" stackId="a" fill="#2563eb" isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="1.5L Packs" stackId="a" fill="#9333ea" isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="0.5L Packs" stackId="a" fill="#10b981" isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="Broken / Waste" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

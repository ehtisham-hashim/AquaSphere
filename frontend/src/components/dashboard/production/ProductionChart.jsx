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
import ChartTooltip from '../charts/ChartTooltip';
import { formatCompactNumber } from '../../../utils/chartFormatters';

export default function ProductionChart({
  chartData,
  selectedDays,
  setSelectedDays,
  isWadaana
}) {
  return (
    <div className="card-surface p-4 sm:p-5 space-y-3">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-slate-700" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Daily Production & Output</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(e.target.value)}
            className="select-base text-xs py-1 px-2.5 w-auto cursor-pointer"
          >
            <option value="7">Past 7 Days</option>
            <option value="14">Past 14 Days</option>
            <option value="30">Past 30 Days</option>
          </select>
        </div>
      </div>

      <div className="w-full h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 12, left: 16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tickFormatter={formatCompactNumber}
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 600 }} 
              iconType="circle"
            />
            {isWadaana ? (
              <>
                <Bar dataKey="Pure 0.5L" stackId="a" fill="#0284c7" maxBarSize={28} />
                <Bar dataKey="Pure 1.5L" stackId="a" fill="#38bdf8" maxBarSize={28} />
                <Bar dataKey="Mix 0.5L" stackId="a" fill="#8b5cf6" maxBarSize={28} />
                <Bar dataKey="Mix 1.5L" stackId="a" fill="#a855f7" maxBarSize={28} />
                <Bar dataKey="Broken / Waste" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </>
            ) : (
              <>
                <Bar dataKey="19L Bottles" stackId="a" fill="#2563eb" maxBarSize={28} />
                <Bar dataKey="1.5L Packs" stackId="a" fill="#8b5cf6" maxBarSize={28} />
                <Bar dataKey="0.5L Packs" stackId="a" fill="#10b981" maxBarSize={28} />
                <Bar dataKey="Broken / Waste" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Activity, Clock } from 'lucide-react';

export default function CpuRamCharts({ history }) {
  const chartData = (history || []).map((point) => {
    const d = new Date(point.timestamp);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    return {
      time: timeStr,
      cpu: Math.round(point.cpu_percent || 0),
      ram: Math.round(point.ram_percent || 0),
    };
  });

  const latestCpu = chartData.length > 0 ? chartData[chartData.length - 1].cpu : 0;
  const latestRam = chartData.length > 0 ? chartData[chartData.length - 1].ram : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-ops-950 border border-ops-700 p-2.5 rounded shadow-xl text-xs font-mono">
          <div className="text-slate-500 mb-1 border-b border-ops-750 pb-1 flex items-center justify-between">
            <span>TIME</span>
            <span className="text-slate-300">{label}</span>
          </div>
          <div className="flex items-center justify-between space-x-4 py-0.5">
            <span className="text-sky-400">cpu_percent:</span>
            <span className="font-bold text-white tnum">{payload[0]?.value}%</span>
          </div>
          <div className="flex items-center justify-between space-x-4 py-0.5">
            <span className="text-purple-400">mem_percent:</span>
            <span className="font-bold text-white tnum">{payload[1]?.value}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-ops-900 border border-ops-700/80 rounded p-4">
      {/* Header / Metric Legend bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-3 border-b border-ops-750 gap-2 font-mono">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-slate-200 tracking-wider uppercase">
            TELEMETRY TIME-SERIES
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-ops-800 text-slate-400 border border-ops-700">
            60s WINDOW
          </span>
        </div>

        {/* Grafana-style tabular legend */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-0.5 bg-sky-400" />
            <span className="text-slate-400 text-[11px]">cpu_usage:</span>
            <span className="font-bold text-sky-400 tnum">{latestCpu}%</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-0.5 bg-purple-400" />
            <span className="text-slate-400 text-[11px]">mem_usage:</span>
            <span className="font-bold text-purple-400 tnum">{latestRam}%</span>
          </div>
        </div>
      </div>

      <div className="h-60 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1c2438" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#475569" 
                fontFamily="JetBrains Mono, monospace"
                fontSize={10} 
                tickLine={false}
                axisLine={{ stroke: '#1c2438' }}
              />
              <YAxis 
                domain={[0, 100]} 
                stroke="#475569" 
                fontFamily="JetBrains Mono, monospace"
                fontSize={10} 
                tickLine={false}
                axisLine={{ stroke: '#1c2438' }}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="linear" 
                dataKey="cpu" 
                stroke="#38bdf8" 
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line 
                type="linear" 
                dataKey="ram" 
                stroke="#c084fc" 
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
            Polling Prometheus / procfs time series...
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { 
  Cpu, 
  Database, 
  HardDrive, 
  ArrowDownUp, 
  Layers, 
  AlertOctagon,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function MetricsOverview({ metrics, containers, errorCount, activeAlertsCount, onTabChange }) {
  const cpu = metrics?.cpu || { percent: 0, cores: [], core_count: 0, load_1m: 0, load_5m: 0, load_15m: 0 };
  const mem = metrics?.memory || { percent: 0, used: 0, total: 1, free: 0, swap_percent: 0, swap_used: 0, swap_total: 1 };
  const disk = metrics?.disk || { overall_percent: 0, used: 0, total: 1, partitions: [] };
  const net = metrics?.network || { tx_rate_kbps: 0, rx_rate_kbps: 0, total_sent_bytes: 0, total_recv_bytes: 0 };
  const containerStats = containers?.stats || { total: 0, running: 0, exited: 0, unhealthy: 0 };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  const getMeterColor = (val) => {
    if (val >= 90) return 'bg-rose-500';
    if (val >= 75) return 'bg-amber-500';
    return 'bg-sky-500';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      
      {/* 1. CPU Telemetry Card */}
      <div className="bg-ops-900 border border-ops-700/80 rounded p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] uppercase tracking-wider mb-2">
            <span>CPU Load</span>
            <span className="text-slate-500">{cpu.core_count} Threads</span>
          </div>
          
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-bold text-white tnum tracking-tight">
              {cpu.percent}%
            </span>
            <span className="text-[11px] font-mono text-slate-500">utilization</span>
          </div>

          {/* Micro Per-Core Heatstrip (htop style!) */}
          <div className="mt-3 grid grid-cols-8 gap-1">
            {(cpu.cores?.length ? cpu.cores : Array(8).fill(cpu.percent)).map((corePct, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-full bg-ops-950 h-7 rounded-sm p-0.5 flex flex-col justify-end border border-ops-750">
                  <div 
                    className={`w-full rounded-xs transition-all duration-300 ${getMeterColor(corePct)}`}
                    style={{ height: `${Math.min(100, Math.max(8, corePct))}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-0.5">{idx}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-ops-750 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Load Avg:</span>
          <span className="text-slate-300 tnum">{cpu.load_1m} / {cpu.load_5m} / {cpu.load_15m}</span>
        </div>
      </div>

      {/* 2. Memory Subsystem Card */}
      <div className="bg-ops-900 border border-ops-700/80 rounded p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] uppercase tracking-wider mb-2">
            <span>System Memory</span>
            <span className="text-slate-500">{formatBytes(mem.total)}</span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-bold text-white tnum tracking-tight">
              {mem.percent}%
            </span>
            <span className="text-[11px] font-mono text-slate-500">{formatBytes(mem.used)} used</span>
          </div>

          {/* Memory stack rail */}
          <div className="w-full bg-ops-950 h-2 rounded-xs mt-3 overflow-hidden flex border border-ops-750">
            <div 
              className="bg-sky-500 h-full transition-all duration-300" 
              style={{ width: `${mem.percent}%` }} 
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="bg-ops-950 p-1.5 rounded border border-ops-750">
              <span className="text-slate-500 block">Available:</span>
              <span className="text-slate-300 font-semibold">{formatBytes(mem.available)}</span>
            </div>
            <div className="bg-ops-950 p-1.5 rounded border border-ops-750">
              <span className="text-slate-500 block">Swap ({mem.swap_percent}%):</span>
              <span className="text-slate-300 font-semibold">{formatBytes(mem.swap_used)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-ops-750 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Buffer/Cache:</span>
          <span className="text-slate-300">Active Alloc</span>
        </div>
      </div>

      {/* 3. Storage Mountpoints */}
      <div className="bg-ops-900 border border-ops-700/80 rounded p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] uppercase tracking-wider mb-2">
            <span>Disk Volumes</span>
            <span className="text-slate-500">{formatBytes(disk.total)}</span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-bold text-white tnum tracking-tight">
              {disk.overall_percent}%
            </span>
            <span className="text-[11px] font-mono text-slate-500">{formatBytes(disk.used)} allocated</span>
          </div>

          {/* Mountpoint summary */}
          <div className="mt-3 space-y-1.5">
            {(disk.partitions?.slice(0, 2) || [{ mountpoint: '/', percent: disk.overall_percent }]).map((p, idx) => (
              <div key={idx} className="text-[10px] font-mono">
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span className="truncate">{p.mountpoint} ({p.fstype || 'ext4'})</span>
                  <span className="text-slate-200">{p.percent}%</span>
                </div>
                <div className="w-full bg-ops-950 h-1.5 rounded-xs overflow-hidden border border-ops-750">
                  <div className={`h-full ${getMeterColor(p.percent)}`} style={{ width: `${p.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-ops-750 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Root I/O:</span>
          <span className="text-emerald-400 font-semibold">HEALTHY</span>
        </div>
      </div>

      {/* 4. Network Ingress / Egress */}
      <div className="bg-ops-900 border border-ops-700/80 rounded p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] uppercase tracking-wider mb-2">
            <span>Network Bandwidth</span>
            <span className="text-slate-500">I/O Rate</span>
          </div>

          <div className="space-y-2 mt-2">
            <div className="p-2 rounded bg-ops-950 border border-ops-750 flex items-center justify-between font-mono">
              <span className="text-[10px] text-slate-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" /> RX (In)
              </span>
              <span className="text-xs font-bold text-emerald-400 tnum">
                {net.rx_rate_kbps > 1024 ? `${(net.rx_rate_kbps / 1024).toFixed(2)} MB/s` : `${net.rx_rate_kbps} KB/s`}
              </span>
            </div>

            <div className="p-2 rounded bg-ops-950 border border-ops-750 flex items-center justify-between font-mono">
              <span className="text-[10px] text-slate-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-sky-400 mr-1.5" /> TX (Out)
              </span>
              <span className="text-xs font-bold text-sky-400 tnum">
                {net.tx_rate_kbps > 1024 ? `${(net.tx_rate_kbps / 1024).toFixed(2)} MB/s` : `${net.tx_rate_kbps} KB/s`}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-ops-750 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Transferred:</span>
          <span className="text-slate-300 truncate">{formatBytes(net.total_recv_bytes + net.total_sent_bytes)}</span>
        </div>
      </div>

      {/* 5. Docker Containers Matrix */}
      <div 
        onClick={() => onTabChange('containers')}
        className="bg-ops-900 border border-ops-700/80 rounded p-3.5 flex flex-col justify-between cursor-pointer hover:border-sky-500/60 transition-colors group"
      >
        <div>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] uppercase tracking-wider mb-2 group-hover:text-sky-400 transition-colors">
            <span>Containers</span>
            <span className="text-slate-500">{containerStats.total} Total</span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-mono font-bold text-white tnum tracking-tight">
              {containerStats.running}
            </span>
            <span className="text-[11px] font-mono text-emerald-400">active running</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            <div className="p-1.5 rounded bg-ops-950 border border-ops-750">
              <span className="text-slate-500 block">Stopped:</span>
              <span className="text-slate-300 font-semibold">{containerStats.exited}</span>
            </div>
            <div className={`p-1.5 rounded border ${containerStats.unhealthy > 0 ? 'bg-rose-950/40 border-rose-500/30 text-rose-300' : 'bg-ops-950 border-ops-750 text-slate-300'}`}>
              <span className="text-slate-500 block">Unhealthy:</span>
              <span className="font-semibold">{containerStats.unhealthy}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-ops-750 flex items-center justify-between text-[10px] font-mono text-sky-400 group-hover:underline">
          <span>Manage Containers</span>
          <span>→</span>
        </div>
      </div>

      {/* 6. Sentry / Incident Center */}
      <div 
        onClick={() => onTabChange('errors')}
        className={`bg-ops-900 border rounded p-3.5 flex flex-col justify-between cursor-pointer transition-colors group ${
          activeAlertsCount > 0 ? 'border-rose-500/50 bg-rose-950/20' : 'border-ops-700/80 hover:border-rose-500/50'
        }`}
      >
        <div>
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] uppercase tracking-wider mb-2 group-hover:text-rose-400 transition-colors">
            <span>Error Incidents</span>
            <span className="text-slate-500">24H Feed</span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-mono font-bold tnum tracking-tight ${activeAlertsCount > 0 ? 'text-rose-400' : 'text-white'}`}>
              {activeAlertsCount}
            </span>
            <span className="text-[11px] font-mono text-slate-500">active alerts</span>
          </div>

          <div className="mt-3 p-2 rounded bg-ops-950 border border-ops-750 text-[10px] font-mono">
            {activeAlertsCount > 0 ? (
              <span className="text-rose-400 font-semibold flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                Unresolved exceptions detected
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                System operating normally
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-ops-750 flex items-center justify-between text-[10px] font-mono text-rose-400 group-hover:underline">
          <span>Review Error Stream</span>
          <span>→</span>
        </div>
      </div>

    </div>
  );
}

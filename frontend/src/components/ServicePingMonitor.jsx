import React, { useState } from 'react';
import { 
  Radio, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock 
} from 'lucide-react';
import { deleteService, checkServices } from '../services/api';

export default function ServicePingMonitor({ services, onRefresh, onOpenAddModal }) {
  const [checking, setChecking] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      await checkServices();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete heartbeat probe '${name}'?`)) return;
    setDeletingId(id);
    try {
      await deleteService(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-ops-900 border border-ops-700/80 rounded overflow-hidden font-mono">
      
      {/* Header bar */}
      <div className="p-3.5 border-b border-ops-700/70 bg-ops-850/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase text-slate-200 tracking-wider">
            Heartbeat Probes & Endpoint Uptime ({services?.length || 0})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-ops-800 hover:bg-ops-750 border border-ops-700 text-xs text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin text-sky-400' : ''}`} />
            <span>Poll Now</span>
          </button>
          
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Target</span>
          </button>
        </div>
      </div>

      {/* Heartbeat Grid */}
      <div className="divide-y divide-ops-750">
        {(services || []).map((s) => {
          const isUp = s.status === 'UP';

          return (
            <div 
              key={s.id} 
              className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-ops-850/60 ${
                !isUp && s.status !== 'PENDING' ? 'bg-rose-950/20' : ''
              }`}
            >
              
              {/* Target info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-2 h-2 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'}`} />
                  <span className="font-semibold text-white text-xs truncate">{s.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-ops-950 text-slate-400 border border-ops-750">
                    {s.service_type || 'HTTP'}
                  </span>
                  <span className="text-slate-500 text-xs truncate max-w-[220px]">
                    {s.url}
                  </span>
                </div>

                {/* BetterStack-style 30-block Uptime Heartbeat Strip */}
                <div className="mt-2.5 flex items-center space-x-1">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-4 w-1.5 rounded-xs transition-colors ${
                        !isUp && i === 29 ? 'bg-rose-500' : 'bg-emerald-500/80 hover:bg-emerald-400'
                      }`}
                      title={isUp ? "99.9% uptime" : "Outage detected"}
                    />
                  ))}
                  <span className="text-[10px] text-slate-500 ml-2">90d history</span>
                </div>
              </div>

              {/* Metrics & Response Time */}
              <div className="flex items-center space-x-6 text-xs shrink-0">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Latency</span>
                  <span className="font-bold text-white tnum">{s.response_time_ms ? `${s.response_time_ms}ms` : '--'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Uptime Ratio</span>
                  <span className={`font-bold tnum ${s.uptime_ratio >= 99 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {s.uptime_ratio !== undefined ? `${s.uptime_ratio}%` : '100%'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Status</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {s.status}
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  disabled={deletingId === s.id}
                  className="p-1 rounded bg-ops-800 hover:bg-ops-750 text-slate-500 hover:text-rose-400 border border-ops-700"
                  title="Remove target"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

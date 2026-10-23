import React, { useState } from 'react';
import { AlertOctagon, AlertTriangle, CheckCheck, ChevronRight, ShieldAlert } from 'lucide-react';
import { acknowledgeAllAlerts } from '../services/api';

export default function AlertsPanel({ alerts, onRefresh, onNavigateToIncidents }) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  if (!alerts || alerts.length === 0) return null;

  const hasCritical = alerts.some(a => a.severity === 'CRITICAL');

  const handleAcknowledgeAll = async (e) => {
    e.stopPropagation();
    setIsAcknowledging(true);
    try {
      await acknowledgeAllAlerts();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <div 
      onClick={onNavigateToIncidents}
      className={`p-3 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono cursor-pointer transition-colors shadow-xs ${
        hasCritical 
          ? 'bg-rose-950/25 border-rose-500/50 hover:bg-rose-950/35' 
          : 'bg-amber-950/25 border-amber-500/40 hover:bg-amber-950/35'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className={`p-1.5 rounded ${hasCritical ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xs text-white uppercase tracking-wider">
              {alerts.length} Active System Incident{alerts.length > 1 ? 's' : ''} Require Attention
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-ops-950 text-rose-400 border border-ops-750 font-bold">
              UNRESOLVED
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-sans mt-0.5 truncate max-w-xl">
            Latest: <span className="font-semibold">{alerts[0]?.title}</span> — {alerts[0]?.message}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
        <button
          onClick={handleAcknowledgeAll}
          disabled={isAcknowledging}
          className="flex items-center space-x-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
          title="Acknowledge and mark all resolved"
        >
          <CheckCheck className={`w-3.5 h-3.5 ${isAcknowledging ? 'animate-spin' : ''}`} />
          <span>Acknowledge All ({alerts.length})</span>
        </button>

        <button 
          onClick={onNavigateToIncidents}
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-ops-850 hover:bg-ops-800 text-slate-300 border border-ops-700 text-xs font-medium"
        >
          <span>Incidents Page</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}

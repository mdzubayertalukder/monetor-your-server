import React, { useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCheck, 
  Check, 
  Clock, 
  Trash2, 
  RefreshCw, 
  Search, 
  Copy, 
  ShieldAlert,
  Archive,
  Zap
} from 'lucide-react';
import { resolveAlert, acknowledgeAllAlerts, clearAlertsHistory } from '../services/api';

export default function IncidentsPage({ alerts, allAlerts, onRefresh, onOpenChaosModal }) {
  const [tab, setTab] = useState('ACTIVE'); // 'ACTIVE', 'RESOLVED', 'ALL'
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [isAcknowledgingAll, setIsAcknowledgingAll] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const activeAlerts = (allAlerts || alerts || []).filter(a => a.status === 'ACTIVE');
  const resolvedAlerts = (allAlerts || []).filter(a => a.status === 'RESOLVED');

  const getDisplayedAlerts = () => {
    let list = [];
    if (tab === 'ACTIVE') list = activeAlerts;
    else if (tab === 'RESOLVED') list = resolvedAlerts;
    else list = (allAlerts || alerts || []);

    return list.filter(a => {
      const matchSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
      const matchSearch = !search || 
        a.title.toLowerCase().includes(search.toLowerCase()) || 
        a.message.toLowerCase().includes(search.toLowerCase());
      return matchSeverity && matchSearch;
    });
  };

  const handleAcknowledgeSingle = async (id) => {
    setProcessingId(id);
    try {
      await resolveAlert(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcknowledgeAll = async () => {
    if (activeAlerts.length === 0) return;
    setIsAcknowledgingAll(true);
    try {
      await acknowledgeAllAlerts();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAcknowledgingAll(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Purge all historical acknowledged alerts from database archive?")) {
      try {
        await clearAlertsHistory();
        onRefresh();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCopyAlert = (alert) => {
    const text = `[${alert.severity}] ${alert.title}\n${alert.message}\nTimestamp: ${alert.timestamp}`;
    navigator.clipboard.writeText(text);
    setCopiedId(alert.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const displayedAlerts = getDisplayedAlerts();

  return (
    <div className="bg-ops-900 border border-ops-700/80 rounded overflow-hidden font-mono">
      
      {/* 1. Header with 'Acknowledge All' primary action */}
      <div className="p-4 border-b border-ops-700/70 bg-ops-850/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Alerts & Incident Management
            </h2>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
              {activeAlerts.length} ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Real-time infrastructure warnings, container crash events, and acknowledged audit archive.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {activeAlerts.length > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              disabled={isAcknowledgingAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
              title="Acknowledge and mark all active alerts resolved"
            >
              <CheckCheck className={`w-3.5 h-3.5 ${isAcknowledgingAll ? 'animate-spin' : ''}`} />
              <span>Acknowledge All ({activeAlerts.length})</span>
            </button>
          )}

          <button
            onClick={onOpenChaosModal}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded bg-ops-800 hover:bg-ops-750 text-slate-300 hover:text-white border border-ops-700 text-xs"
            title="Inject test alert"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Inject Test Alert</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-1.5 rounded bg-ops-800 hover:bg-ops-750 text-slate-400 hover:text-white border border-ops-700"
            title="Refresh alerts"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {resolvedAlerts.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded bg-ops-800 hover:bg-ops-750 text-slate-500 hover:text-rose-400 border border-ops-700"
              title="Clear resolved archive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Sub-tabs & Search Toolbar */}
      <div className="px-4 py-2.5 bg-ops-950/70 border-b border-ops-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 bg-ops-900 p-0.5 rounded border border-ops-750">
          <button
            onClick={() => setTab('ACTIVE')}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'ACTIVE'
                ? 'bg-ops-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active & Pending ({activeAlerts.length})
          </button>
          <button
            onClick={() => setTab('RESOLVED')}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'RESOLVED'
                ? 'bg-ops-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Acknowledged Archive ({resolvedAlerts.length})
          </button>
          <button
            onClick={() => setTab('ALL')}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'ALL'
                ? 'bg-ops-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Incidents ({(allAlerts || []).length})
          </button>
        </div>

        {/* Severity & Search filters */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-[11px]">
            <span className="text-slate-500">Level:</span>
            {['ALL', 'CRITICAL', 'ERROR', 'WARNING'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setSeverityFilter(lvl)}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  severityFilter === lvl ? 'bg-ops-750 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="relative w-44">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter alerts..."
              className="w-full bg-ops-900 border border-ops-700 rounded px-2 pl-6 py-0.5 text-xs text-white placeholder-slate-600 focus:outline-none"
            />
          </div>
        </div>

      </div>

      {/* 3. Incidents List */}
      <div className="divide-y divide-ops-750">
        {displayedAlerts.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCheck className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">
              {tab === 'ACTIVE' ? 'All Incidents Acknowledged' : 'No Incidents Found'}
            </div>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              {tab === 'ACTIVE' 
                ? 'Zero pending or unacknowledged alerts on this server.' 
                : 'No alerts match the selected filter criteria.'}
            </p>
            {tab === 'ACTIVE' && (
              <button
                onClick={() => setTab('RESOLVED')}
                className="mt-3 px-2.5 py-1 rounded bg-ops-850 hover:bg-ops-800 border border-ops-700 text-sky-400 text-xs"
              >
                View Acknowledged Archive →
              </button>
            )}
          </div>
        ) : (
          displayedAlerts.map(alert => {
            const isCritical = alert.severity === 'CRITICAL';
            const isError = alert.severity === 'ERROR';
            const isResolved = alert.status === 'RESOLVED';
            const isProcessing = processingId === alert.id;

            return (
              <div 
                key={alert.id}
                className={`p-4 transition-colors hover:bg-ops-850/60 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isResolved ? 'opacity-40 bg-ops-950/40' : isCritical ? 'bg-rose-950/15' : ''
                }`}
              >
                {/* Left: Severity badge, Title, Message */}
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div className="pt-0.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : isError
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold text-xs ${isCritical ? 'text-rose-200' : 'text-slate-100'} ${isResolved ? 'line-through text-slate-500' : ''}`}>
                        {alert.title}
                      </span>
                      <span className="text-slate-600 text-[10px]">#ref:{alert.id}</span>
                      {isResolved && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                          ACKNOWLEDGED
                        </span>
                      )}
                    </div>

                    <p className={`text-xs text-slate-300 font-sans mt-1 break-words ${isResolved ? 'line-through text-slate-500' : ''}`}>
                      {alert.message}
                    </p>

                    <div className="flex items-center space-x-4 text-[10px] text-slate-500 mt-2">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span>Triggered: {new Date(alert.timestamp).toLocaleTimeString()} UTC</span>
                      </span>
                      {alert.resolved_at && (
                        <span className="text-emerald-400/80">
                          Acknowledged at: {new Date(alert.resolved_at).toLocaleTimeString()} UTC
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleCopyAlert(alert)}
                    className="p-1 rounded bg-ops-800 hover:bg-ops-750 text-slate-400 hover:text-white border border-ops-700"
                    title="Copy incident details"
                  >
                    {copiedId === alert.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {!isResolved && (
                    <button
                      onClick={() => handleAcknowledgeSingle(alert.id)}
                      disabled={isProcessing}
                      className="flex items-center space-x-1 px-3 py-1 rounded bg-ops-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-ops-700 hover:border-emerald-500 text-xs font-semibold transition-colors"
                      title="Acknowledge and mark resolved"
                    >
                      <Check className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>Acknowledge</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 4. Footer */}
      <div className="p-3 bg-ops-950/80 border-t border-ops-750 flex items-center justify-between text-[11px] text-slate-500">
        <span>{displayedAlerts.length} total incidents in this view</span>
        <span>Acknowledge All updates state immediately across all connected clients</span>
      </div>

    </div>
  );
}

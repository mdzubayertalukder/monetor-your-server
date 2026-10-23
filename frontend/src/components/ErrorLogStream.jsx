import React, { useState } from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  Search, 
  Trash2, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  Clock, 
  RefreshCw,
  Copy,
  CheckCheck,
  Zap,
  Filter,
  Layers
} from 'lucide-react';
import { resolveError, clearErrors } from '../services/api';

export default function ErrorLogStream({ errors, onRefresh, onOpenTestErrorModal }) {
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('UNRESOLVED');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const filteredErrors = (errors || []).filter((item) => {
    const matchesLevel = filterLevel === 'ALL' || item.level === filterLevel;
    const matchesStatus = 
      filterStatus === 'ALL' || 
      (filterStatus === 'UNRESOLVED' && item.resolved === 0) ||
      (filterStatus === 'RESOLVED' && item.resolved === 1);
    const matchesSearch = 
      !searchQuery ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.raw_text && item.raw_text.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLevel && matchesStatus && matchesSearch;
  });

  const handleResolve = async (id, e) => {
    e.stopPropagation();
    setResolvingId(id);
    try {
      await resolveError(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleCopyTrace = (err, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(err.raw_text || err.message);
    setCopiedId(err.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearAll = async () => {
    if (window.confirm("Purge all recorded error diagnostic logs from database?")) {
      try {
        await clearErrors();
        onRefresh();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getSeverityBadge = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
            CRIT
          </span>
        );
      case 'ERROR':
        return (
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            ERR
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            WARN
          </span>
        );
    }
  };

  const formatTimestamp = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return `${d.toLocaleTimeString()} UTC`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="bg-ops-900 border border-ops-700/80 rounded overflow-hidden">
      
      {/* Sentry-Style Incident Control Header */}
      <div className="p-3.5 border-b border-ops-700/70 bg-ops-850/70 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span className="font-mono text-xs font-bold uppercase text-slate-200 tracking-wider">
              Error Sentry & Diagnostics
            </span>
          </div>

          <div className="flex items-center space-x-1 font-mono text-[11px] bg-ops-950 p-0.5 rounded border border-ops-750">
            <button
              onClick={() => setFilterStatus('UNRESOLVED')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filterStatus === 'UNRESOLVED' ? 'bg-ops-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Unresolved ({errors.filter(e => e.resolved === 0).length})
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filterStatus === 'ALL' ? 'bg-ops-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Events ({errors.length})
            </button>
            <button
              onClick={() => setFilterStatus('RESOLVED')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filterStatus === 'RESOLVED' ? 'bg-ops-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Resolved ({errors.filter(e => e.resolved === 1).length})
            </button>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stacktraces..."
              className="w-full bg-ops-950 border border-ops-700 rounded px-2 pl-7 py-1 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-ops-accent"
            />
          </div>

          <button
            onClick={onOpenTestErrorModal}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono"
            title="Simulate error event"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Inject</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-1 rounded bg-ops-800 hover:bg-ops-750 border border-ops-700 text-slate-400 hover:text-white"
            title="Refresh issues"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {errors?.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1 rounded bg-ops-800 hover:bg-ops-750 border border-ops-700 text-slate-500 hover:text-rose-400"
              title="Purge errors database"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Severity filter pills */}
      <div className="px-3.5 py-2 bg-ops-950/60 border-b border-ops-750 flex items-center space-x-2 text-[11px] font-mono">
        <span className="text-slate-500">Filter Severity:</span>
        {['ALL', 'CRITICAL', 'ERROR', 'WARNING'].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setFilterLevel(lvl)}
            className={`px-2 py-0.5 rounded transition-all ${
              filterLevel === lvl
                ? 'bg-ops-750 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Issues Table List */}
      <div className="divide-y divide-ops-750 font-mono">
        {filteredErrors.length === 0 ? (
          <div className="py-14 text-center">
            <CheckCheck className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
            <div className="text-xs font-mono text-slate-300 font-semibold">NO ACTIVE INCIDENTS</div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              Kernel syslog and container stderr streams are clean.
            </div>
            <button
              onClick={onOpenTestErrorModal}
              className="mt-3 px-2.5 py-1 rounded bg-ops-850 hover:bg-ops-800 border border-ops-700 text-[11px] text-sky-400 font-mono"
            >
              Simulate Error Injection →
            </button>
          </div>
        ) : (
          filteredErrors.map((err) => {
            const isExpanded = expandedId === err.id;
            const isResolved = err.resolved === 1;

            return (
              <div 
                key={err.id}
                onClick={() => setExpandedId(isExpanded ? null : err.id)}
                className={`p-3 transition-colors cursor-pointer hover:bg-ops-850/60 ${
                  isResolved ? 'opacity-40 bg-ops-950/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  
                  {/* Left: Severity & Summary */}
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="pt-0.5 shrink-0">{getSeverityBadge(err.level)}</div>

                    <div className="flex-1 min-w-0">
                      {/* Origin & Metadata Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-ops-800 text-sky-300 border border-ops-700 font-semibold truncate max-w-[200px]">
                          {err.source}
                        </span>
                        <span className="text-slate-500">
                          {formatTimestamp(err.timestamp)}
                        </span>
                        <span className="text-slate-600">#id:{err.id}</span>
                        {isResolved && (
                          <span className="text-emerald-400 font-semibold">[RESOLVED]</span>
                        )}
                      </div>

                      {/* Main Message Title */}
                      <p className={`text-xs font-medium text-slate-200 break-words font-sans ${isResolved ? 'line-through text-slate-500' : ''}`}>
                        {err.message}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {!isResolved && (
                      <button
                        onClick={(e) => handleResolve(err.id, e)}
                        disabled={resolvingId === err.id}
                        className="px-2 py-0.5 rounded text-[11px] bg-ops-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-ops-700 hover:border-emerald-500/30 transition-colors"
                        title="Mark issue resolved"
                      >
                        Resolve
                      </button>
                    )}
                    <span className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                  </div>

                </div>

                {/* Sentry Stacktrace Code Block */}
                {isExpanded && (
                  <div className="mt-3 pt-2.5 border-t border-ops-750" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5">
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-slate-300 font-semibold">STACKTRACE & RAW LOG FRAME</span>
                      </div>
                      <button
                        onClick={(e) => handleCopyTrace(err, e)}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-ops-800 hover:bg-ops-750 text-slate-300 text-[10px]"
                      >
                        {copiedId === err.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>COPY TRACE</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-3 rounded bg-[#04060a] border border-ops-750 text-[11px] leading-relaxed text-rose-300 overflow-x-auto whitespace-pre-wrap selection:bg-rose-900 selection:text-white">
                      {err.raw_text || err.message}
                    </div>

                    <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
                      <span>Source Pipe: Linux kernel syslog / docker daemon socket</span>
                      <span>Fingerprint: {err.source}</span>
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

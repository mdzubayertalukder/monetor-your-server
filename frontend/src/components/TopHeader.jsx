import React from 'react';
import { 
  Search, 
  RefreshCw, 
  Clock, 
  Terminal, 
  Zap, 
  SlidersHorizontal,
  Bell
} from 'lucide-react';

export default function TopHeader({ 
  activeTabTitle, 
  hostname, 
  onRefresh, 
  searchQuery, 
  setSearchQuery,
  onOpenChaosModal,
  activeAlertsCount 
}) {
  return (
    <header className="h-14 border-b border-ops-700/60 bg-ops-900/90 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-30">
      
      {/* Left: Breadcrumbs & Cluster tag */}
      <div className="flex items-center space-x-3 text-xs font-mono">
        <span className="text-slate-500">cluster</span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400 font-medium">{hostname || 'local-node-01'}</span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-200 font-semibold uppercase">{activeTabTitle}</span>
        
        <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
          PROD-ACTIVE
        </span>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center relative w-72">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5" />
        <input
          type="text"
          value={searchQuery || ''}
          onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
          placeholder="Filter metrics, logs, PIDs ( / )..."
          className="w-full bg-ops-950 border border-ops-700/80 rounded px-2.5 pl-8 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-ops-accent transition-colors"
        />
      </div>

      {/* Right Action Utilities */}
      <div className="flex items-center space-x-2.5">
        
        {/* Time window selector */}
        <div className="hidden lg:flex items-center space-x-1 bg-ops-950 border border-ops-700/80 rounded p-0.5 text-[11px] font-mono text-slate-400">
          <span className="px-2 py-0.5 rounded bg-ops-800 text-slate-200 font-medium">LIVE (2s)</span>
          <button className="px-2 py-0.5 hover:text-slate-200">15m</button>
          <button className="px-2 py-0.5 hover:text-slate-200">1h</button>
        </div>

        <button
          onClick={onRefresh}
          className="p-1.5 rounded bg-ops-850 hover:bg-ops-800 border border-ops-700 text-slate-300 hover:text-white transition-colors"
          title="Force telemetry refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenChaosModal}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono font-medium transition-colors"
          title="Inject a test server error"
        >
          <Zap className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Inject Error</span>
        </button>
      </div>

    </header>
  );
}

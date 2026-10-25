import React from 'react';
import { 
  Server, 
  AlertOctagon, 
  Layers, 
  Radio, 
  Cpu, 
  Terminal, 
  Activity, 
  ShieldAlert, 
  Flame, 
  Clock, 
  ChevronRight,
  HardDrive,
  Boxes
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isConnected, 
  hostInfo, 
  activeAlertsCount,
  containerCount,
  onOpenTestErrorModal
}) {
  const navItems = [
    { id: 'dashboard', label: 'Infrastructure', icon: Server, keyNum: '1' },
    { 
      id: 'incidents', 
      label: 'Incidents & Alerts', 
      icon: ShieldAlert, 
      keyNum: '2', 
      badge: activeAlertsCount > 0 ? `${activeAlertsCount} ACTIVE` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    },
    { 
      id: 'errors', 
      label: 'Error Logs & Sentry', 
      icon: AlertOctagon, 
      keyNum: '3', 
    },
    { 
      id: 'containers', 
      label: 'Docker Containers', 
      icon: Layers, 
      keyNum: '4',
      badge: containerCount?.running !== undefined ? `${containerCount.running}/${containerCount.total}` : null,
      badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    },
    { 
      id: 'kubernetes', 
      label: 'Kubernetes Workloads', 
      icon: Boxes, 
      keyNum: '5',
      badge: 'K8s',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    },
    { id: 'services', label: 'Heartbeat Probes', icon: Radio, keyNum: '6' },
    { id: 'processes', label: 'Process Inspector', icon: Cpu, keyNum: '7' },
  ];

  const formatUptime = (seconds) => {
    if (!seconds) return '0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <aside className="w-64 bg-ops-900 border-r border-ops-700/60 flex flex-col justify-between select-none shrink-0 h-screen sticky top-0">
      
      {/* Top Branding & Host Selector */}
      <div>
        <div className="p-4 border-b border-ops-700/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-ops-800 border border-ops-700 flex items-center justify-center text-sky-400">
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-200">
                  KernelPulse
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ops-800 text-slate-400 border border-ops-700">
                  v2.4
                </span>
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span className="text-[11px] font-mono text-slate-400 truncate">
                  {isConnected ? 'NODE ONLINE' : 'DISCONNECTED'}
                </span>
              </div>
            </div>
          </div>

          {/* Node host badge */}
          <div className="mt-3.5 p-2 rounded bg-ops-850 border border-ops-700/70 text-[11px] font-mono">
            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Monitored Target</div>
            <div className="text-slate-200 font-semibold truncate">
              {hostInfo?.hostname || '127.0.0.1 (Localhost)'}
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[10px] mt-1 pt-1 border-t border-ops-750">
              <span>{hostInfo?.system || 'Linux'} {hostInfo?.architecture || 'x86_64'}</span>
              <span className="text-emerald-400">UP {formatUptime(hostInfo?.uptime_seconds)}</span>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-2 py-3">
          <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Telemetry & Telemetry Views
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-ops-800 text-white border-l-2 border-sky-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-ops-850/60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {item.badge && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-600 hidden group-hover:inline">
                      {item.keyNum}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Controls & Chaos Fault Injection */}
      <div className="p-3 border-t border-ops-700/60 bg-ops-950/40 space-y-2">
        <button
          onClick={onOpenTestErrorModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded bg-ops-850 hover:bg-ops-800 border border-ops-700 text-xs font-mono text-slate-300 transition-colors group"
          title="Inject artificial server error to test telemetry pipeline"
        >
          <div className="flex items-center space-x-2">
            <Flame className="w-3.5 h-3.5 text-amber-400 group-hover:text-rose-400 transition-colors" />
            <span className="text-[11px] font-medium">Fault Injector</span>
          </div>
          <span className="text-[10px] px-1 rounded bg-ops-750 text-slate-400">TEST</span>
        </button>

        <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between px-1">
          <span>Engine: Docker v29</span>
          <span className="text-slate-400">Port 8088</span>
        </div>
      </div>

    </aside>
  );
}

import React from 'react';
import { 
  Activity, 
  Server, 
  AlertTriangle, 
  Layers, 
  Terminal, 
  Globe, 
  Cpu, 
  Zap, 
  RefreshCw 
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  isConnected, 
  hostInfo, 
  activeAlertsCount,
  onOpenTestErrorModal
}) {
  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'errors', label: 'Server Errors', icon: AlertTriangle, badge: activeAlertsCount },
    { id: 'containers', label: 'Docker Containers', icon: Layers },
    { id: 'services', label: 'Uptime & Services', icon: Globe },
    { id: 'processes', label: 'Processes', icon: Cpu },
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
    <header className="border-b border-dark-700 bg-dark-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Connection Status */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">PulseOps</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
                  v1.0
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  <span>{isConnected ? 'Real-time WebSocket' : 'Reconnecting...'}</span>
                </span>
                <span>•</span>
                <span>{hostInfo?.hostname || 'Host Server'}</span>
                {hostInfo?.uptime_seconds && (
                  <>
                    <span>•</span>
                    <span>Up: {formatUptime(hostInfo.uptime_seconds)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-xs font-bold bg-rose-500 text-white">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenTestErrorModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-colors shadow-sm"
              title="Trigger a simulated server error to test monitoring"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Error</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto py-2 space-x-2 border-t border-dark-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-dark-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="px-1 rounded-full text-[10px] bg-rose-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

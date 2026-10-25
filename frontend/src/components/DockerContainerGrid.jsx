import React, { useState } from 'react';
import { 
  Layers, 
  RotateCw, 
  FileText, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert,
  Terminal,
  PowerOff,
  Play,
  RotateCcw
} from 'lucide-react';
import { restartContainer, stopContainer, startContainer } from '../services/api';

export default function DockerContainerGrid({ containersData, onOpenLogsModal, onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [restartingId, setRestartingId] = useState(null);
  const [stoppingId, setStoppingId] = useState(null);
  const [startingId, setStartingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const isDockerAvailable = containersData?.docker_available !== false;
  const rawContainers = containersData?.containers || [];

  const filteredContainers = rawContainers.filter(c => {
    const matchesSearch = 
      !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.image.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'RUNNING') return c.status === 'running';
    if (statusFilter === 'STOPPED') return c.status === 'exited' || c.status === 'dead';
    if (statusFilter === 'UNHEALTHY') return c.state?.health === 'unhealthy';
    return true;
  });

  const handleRestart = async (id, name) => {
    if (!window.confirm(`Issue SIGTERM / restart to container '${name}'?`)) return;
    setRestartingId(id);
    setActionMessage(`Restarting container ${name}...`);
    try {
      await restartContainer(id);
      setActionMessage(`Container ${name} restarted.`);
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
    } catch (err) {
      setActionMessage(`Failed: ${err?.response?.data?.detail || err.message}`);
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setRestartingId(null);
    }
  };

  const handleStop = async (id, name) => {
    if (!window.confirm(`Turn OFF (stop) Docker container '${name}'?`)) return;
    setStoppingId(id);
    setActionMessage(`Stopping container ${name}...`);
    try {
      await stopContainer(id);
      setActionMessage(`Container ${name} turned OFF.`);
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
    } catch (err) {
      setActionMessage(`Failed to stop ${name}: ${err?.response?.data?.detail || err.message}`);
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setStoppingId(null);
    }
  };

  const handleStart = async (id, name) => {
    setStartingId(id);
    setActionMessage(`Starting container ${name}...`);
    try {
      await startContainer(id);
      setActionMessage(`Container ${name} turned ON.`);
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
    } catch (err) {
      setActionMessage(`Failed to start ${name}: ${err?.response?.data?.detail || err.message}`);
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setStartingId(null);
    }
  };

  const getStatusBadge = (status, health) => {
    if (health === 'unhealthy') {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <ShieldAlert className="w-2.5 h-2.5" />
          <span>UNHEALTHY</span>
        </span>
      );
    }
    if (status === 'running') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>RUNNING</span>
        </span>
      );
    }
    if (status === 'restarting') {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <RotateCw className="w-2.5 h-2.5 animate-spin" />
          <span>RESTARTING</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-ops-950 border border-ops-750">
        <span>STOPPED</span>
      </span>
    );
  };

  if (!isDockerAvailable) {
    return (
      <div className="bg-ops-900 border border-ops-700 rounded p-8 text-center font-mono">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-white">Docker Daemon Unreachable</h3>
        <p className="text-xs text-slate-400 mt-1">
          Socket path <code className="text-sky-400">/var/run/docker.sock</code> is not accessible.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-ops-900 border border-ops-700/80 rounded overflow-hidden">
      
      {/* Control bar */}
      <div className="p-3.5 border-b border-ops-700/70 bg-ops-850/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold uppercase text-slate-200 tracking-wider">
              Docker Engine Containers ({rawContainers.length})
            </span>
          </div>

          <div className="flex items-center space-x-1 text-[11px] bg-ops-950 p-0.5 rounded border border-ops-750">
            {['ALL', 'RUNNING', 'STOPPED', 'UNHEALTHY'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  statusFilter === filter ? 'bg-ops-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {actionMessage && (
            <span className="text-[11px] text-sky-400 font-mono animate-fade">
              {actionMessage}
            </span>
          )}

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name / image..."
              className="w-full bg-ops-950 border border-ops-700 rounded px-2 pl-7 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-ops-accent"
            />
          </div>
        </div>

      </div>

      {/* High-density Enterprise Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-ops-950 border-b border-ops-750 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-4">Container Name / ID</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Image Source</th>
              <th className="py-2.5 px-4">Exposed Ports</th>
              <th className="py-2.5 px-4">Restarts</th>
              <th className="py-2.5 px-4 text-right">Container Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ops-750 text-slate-300">
            {filteredContainers.map((c) => {
              const isRestarting = restartingId === c.id;
              const isStopping = stoppingId === c.id;
              const isStarting = startingId === c.id;
              const isBusy = isRestarting || isStopping || isStarting;
              const isSelf = c.name === "pulseops-server-monitor" || c.name === "servermon-app";

              return (
                <tr key={c.id} className="hover:bg-ops-850/60 transition-colors">
                  
                  {/* Name & ID */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white truncate max-w-[200px]" title={c.name}>
                        {c.name}
                      </span>
                      <span className="text-slate-500 text-[10px]">#{c.id}</span>
                      {isSelf && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                          SELF
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-4">
                    {getStatusBadge(c.status, c.state?.health)}
                  </td>

                  {/* Image */}
                  <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[220px]" title={c.image}>
                    {c.image}
                  </td>

                  {/* Ports */}
                  <td className="py-2.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                      {c.ports?.length ? (
                        c.ports.slice(0, 2).map((p, i) => (
                          <span key={i} className="text-[10px] px-1 py-0.2 rounded bg-ops-950 text-slate-300 border border-ops-750">
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-600 text-[10px]">--</span>
                      )}
                      {c.ports?.length > 2 && (
                        <span className="text-slate-500 text-[10px]">+{c.ports.length - 2}</span>
                      )}
                    </div>
                  </td>

                  {/* Restarts */}
                  <td className="py-2.5 px-4">
                    <span className={c.state?.restart_count > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                      {c.state?.restart_count || 0}
                    </span>
                    {c.state?.exit_code !== undefined && c.state.exit_code !== 0 && (
                      <span className="ml-1 text-[10px] text-rose-400">
                        (exit {c.state.exit_code})
                      </span>
                    )}
                  </td>

                  {/* Lifecycle Actions */}
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      
                      {/* Tail Logs Button */}
                      <button
                        onClick={() => onOpenLogsModal(c.id, c.name)}
                        className="px-2 py-1 rounded bg-ops-800 hover:bg-ops-750 border border-ops-700 text-slate-300 hover:text-white flex items-center space-x-1 text-[11px]"
                        title="Tail stdout/stderr logs"
                      >
                        <Terminal className="w-3 h-3 text-sky-400" />
                        <span className="hidden sm:inline">Logs</span>
                      </button>

                      {/* Turn Off / Stop Button (When Running) */}
                      {c.status === 'running' ? (
                        <button
                          onClick={() => handleStop(c.id, c.name)}
                          disabled={isBusy || isSelf}
                          className={`px-2 py-1 rounded border flex items-center space-x-1 text-[11px] font-medium transition-colors ${
                            isSelf
                              ? 'opacity-40 cursor-not-allowed bg-ops-950 border-ops-750 text-slate-500'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 hover:border-rose-500/50'
                          }`}
                          title={isSelf ? "Cannot turn off PulseOps monitor itself" : "Turn OFF / Stop this container"}
                        >
                          <PowerOff className={`w-3 h-3 ${isStopping ? 'animate-spin' : 'text-rose-400'}`} />
                          <span>Stop</span>
                        </button>
                      ) : (
                        /* Turn On / Start Button (When Stopped) */
                        <button
                          onClick={() => handleStart(c.id, c.name)}
                          disabled={isBusy}
                          className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 flex items-center space-x-1 text-[11px] font-medium transition-colors"
                          title="Turn ON / Start this container"
                        >
                          <Play className={`w-3 h-3 ${isStarting ? 'animate-spin' : 'text-emerald-400'}`} />
                          <span>Start</span>
                        </button>
                      )}

                      {/* Restart Button (When Running) */}
                      {c.status === 'running' && (
                        <button
                          onClick={() => handleRestart(c.id, c.name)}
                          disabled={isBusy}
                          className="p-1.5 rounded bg-ops-800 hover:bg-ops-750 border border-ops-700 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Restart Container"
                        >
                          <RotateCw className={`w-3 h-3 ${isRestarting ? 'animate-spin text-sky-400' : ''}`} />
                        </button>
                      )}

                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

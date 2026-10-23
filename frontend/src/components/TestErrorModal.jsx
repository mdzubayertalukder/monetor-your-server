import React, { useState } from 'react';
import { X, Flame, Bug, Terminal, AlertTriangle } from 'lucide-react';
import { triggerTestError } from '../services/api';

export default function TestErrorModal({ onClose, onSuccess }) {
  const [level, setLevel] = useState('ERROR');
  const [source, setSource] = useState('container:ecommerce-mysql-1');
  const [message, setMessage] = useState('OperationalError: Connection pool exhausted (Max 100 active connections reached)');
  const [rawText, setRawText] = useState('sqlalchemy.exc.TimeoutError: QueuePool limit of size 100 overflow 20 reached, connection timed out.');
  const [loading, setLoading] = useState(false);

  const presets = [
    {
      name: 'MySQL Pool Exhaustion',
      level: 'ERROR',
      source: 'container:ecommerce-mysql-1',
      msg: 'OperationalError: Connection pool exhausted (Max 100 active connections reached)',
      trace: 'sqlalchemy.exc.TimeoutError: QueuePool limit of size 100 overflow 20 reached.'
    },
    {
      name: 'Kernel OOM Killer',
      level: 'CRITICAL',
      source: 'kernel:oom_killer',
      msg: 'Out of memory: Kill process 29141 (node) score 920',
      trace: 'kernel: [189201.291] Out of memory: Kill process 29141 (node) total-vm:8.2GB, anon-rss:7.9GB'
    },
    {
      name: 'Nginx 502 Bad Gateway',
      level: 'ERROR',
      source: 'file:nginx-error.log',
      msg: 'connect() failed (111: Connection refused) while connecting to upstream',
      trace: '2026/10/23 14:02:15 [error] 4812#4812: *9120 upstream "http://127.0.0.1:9000" failed.'
    },
    {
      name: 'Container OOM Exit 137',
      level: 'CRITICAL',
      source: 'container:inventory-app',
      msg: 'Container terminated unexpectedly with exit code 137 (SIGKILL/OOM)',
      trace: 'Container state: {"Dead": false, "ExitCode": 137, "Error": "fatal: memory limit exceeded"}'
    }
  ];

  const handleApplyPreset = (p) => {
    setLevel(p.level);
    setSource(p.source);
    setMessage(p.msg);
    setRawText(p.trace);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await triggerTestError({
        level,
        source,
        message,
        raw_text: rawText
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert(`Error injecting fault: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
      <div className="bg-ops-950 border border-ops-700 rounded w-full max-w-xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-3.5 border-b border-ops-700 bg-ops-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <div>
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                Fault Injection & Chaos Testing Console
              </span>
              <div className="text-[10px] text-slate-500">Dispatch artificial error into syslog & alert engine</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          
          {/* Quick presets */}
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
              Select Preset Scenario:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className="text-left p-2 rounded bg-ops-900 hover:bg-ops-850 border border-ops-750 transition-colors text-xs"
                >
                  <div className="font-semibold text-slate-200 flex items-center justify-between">
                    <span>{p.name}</span>
                    <span className={`text-[9px] px-1 rounded ${p.level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {p.level}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.source}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 uppercase mb-1">Severity Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-ops-900 border border-ops-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
              >
                <option value="CRITICAL">CRITICAL (Trigger High Alert)</option>
                <option value="ERROR">ERROR</option>
                <option value="WARNING">WARNING</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 uppercase mb-1">Origin / Source Pipe</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-ops-900 border border-ops-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
                placeholder="container:name or syslog"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 uppercase mb-1">Error Exception String</label>
            <input
              type="text"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-ops-900 border border-ops-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 uppercase mb-1">Traceback / Raw Diagnostic Log</label>
            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-ops-900 border border-ops-700 rounded p-2 text-xs text-rose-300 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-ops-750">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded text-xs text-slate-400 hover:bg-ops-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-1 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
            >
              {loading ? 'Injecting...' : 'INJECT FAULT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

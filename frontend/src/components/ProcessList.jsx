import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Terminal } from 'lucide-react';
import { fetchProcesses } from '../services/api';

export default function ProcessList() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadProcesses = async () => {
    setLoading(true);
    try {
      const data = await fetchProcesses(15);
      setProcesses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses();
    const interval = setInterval(loadProcesses, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-ops-900 border border-ops-700/80 rounded overflow-hidden font-mono">
      <div className="p-3.5 border-b border-ops-700/70 bg-ops-850/70 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase text-slate-200 tracking-wider">
            Kernel Process Inspector (top 15)
          </span>
        </div>
        <button
          onClick={loadProcesses}
          disabled={loading}
          className="p-1 rounded bg-ops-800 hover:bg-ops-750 border border-ops-700 text-slate-400 hover:text-white"
          title="Refresh ps snapshot"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-ops-950 text-slate-500 uppercase text-[10px] tracking-wider border-b border-ops-750">
            <tr>
              <th className="py-2 px-3">PID</th>
              <th className="py-2 px-3">Command</th>
              <th className="py-2 px-3">User</th>
              <th className="py-2 px-3">CPU%</th>
              <th className="py-2 px-3">MEM%</th>
              <th className="py-2 px-3">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ops-750 text-slate-300">
            {processes.map((p) => (
              <tr key={p.pid} className="hover:bg-ops-850/60 transition-colors">
                <td className="py-1.5 px-3 text-sky-400 font-semibold">{p.pid}</td>
                <td className="py-1.5 px-3 font-semibold text-white truncate max-w-[180px]">{p.name}</td>
                <td className="py-1.5 px-3 text-slate-500">{p.user}</td>
                <td className="py-1.5 px-3 tnum">
                  <span className={`px-1 rounded ${p.cpu > 50 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-200'}`}>
                    {p.cpu}%
                  </span>
                </td>
                <td className="py-1.5 px-3 tnum text-slate-400">{p.memory}%</td>
                <td className="py-1.5 px-3">
                  <span className="text-[10px] px-1 py-0.2 rounded bg-ops-950 text-slate-400 border border-ops-750">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

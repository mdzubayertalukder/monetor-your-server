import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Terminal, 
  RefreshCw, 
  Search, 
  Download,
  Copy,
  Check
} from 'lucide-react';
import { fetchContainerLogs } from '../services/api';

export default function ContainerLogModal({ containerId, containerName, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [tailCount, setTailCount] = useState(150);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchContainerLogs(containerId, tailCount);
      setLogs(res.logs || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (containerId) loadLogs();
  }, [containerId, tailCount]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter(l => 
    !filterText || 
    l.message.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleCopyLogs = () => {
    const text = filteredLogs.map(l => `${l.timestamp} [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
      <div className="bg-ops-950 border border-ops-700 rounded w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Terminal Header */}
        <div className="p-3 border-b border-ops-700 bg-ops-900 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-4 h-4 text-sky-400" />
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-xs">{containerName}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-ops-800 text-slate-400 border border-ops-700">
                #{containerId}
              </span>
              <span className="text-[10px] text-slate-500">STDOUT / STDERR PIPELINE</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyLogs}
              className="px-2 py-0.5 rounded bg-ops-800 hover:bg-ops-750 text-slate-300 text-xs flex items-center space-x-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-1 rounded bg-ops-800 hover:bg-ops-750 text-slate-400 hover:text-white"
              title="Tail fresh logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-3 py-1.5 bg-ops-900/60 border-b border-ops-750 flex items-center justify-between text-xs text-slate-400">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1.5" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="grep pattern in logs..."
              className="w-full bg-ops-950 border border-ops-700 rounded pl-7 pr-2 py-0.5 text-xs text-white placeholder-slate-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 text-[11px]">
            <span>TAIL:</span>
            <select
              value={tailCount}
              onChange={(e) => setTailCount(Number(e.target.value))}
              className="bg-ops-950 border border-ops-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="50">50 lines</option>
              <option value="150">150 lines</option>
              <option value="300">300 lines</option>
              <option value="500">500 lines</option>
            </select>
          </div>
        </div>

        {/* Monospace Output */}
        <div className="flex-1 p-3 overflow-y-auto text-[11px] leading-snug bg-[#040609] text-slate-300 space-y-0.5 select-text">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin mr-2 text-sky-400" />
              Streaming container socket...
            </div>
          ) : error ? (
            <div className="p-3 text-rose-400 bg-rose-950/20 border border-rose-500/20">
              {error}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600">
              Zero lines matched filter.
            </div>
          ) : (
            filteredLogs.map((item, idx) => {
              const isError = item.level === 'ERROR';
              const isWarn = item.level === 'WARN';

              return (
                <div 
                  key={idx}
                  className={`flex items-start space-x-2 py-0.5 px-1 rounded-xs hover:bg-slate-900/80 ${
                    isError ? 'text-rose-400 bg-rose-950/30 font-medium' : isWarn ? 'text-amber-300' : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 select-none text-[10px] w-24 shrink-0">
                    {item.timestamp ? item.timestamp.slice(11, 19) : ''}
                  </span>
                  {isError ? (
                    <span className="text-rose-400 text-[10px] font-bold shrink-0">[ERR]</span>
                  ) : isWarn ? (
                    <span className="text-amber-400 text-[10px] font-bold shrink-0">[WRN]</span>
                  ) : (
                    <span className="text-slate-600 text-[10px] shrink-0">[INF]</span>
                  )}
                  <span className="flex-1 break-all whitespace-pre-wrap">{item.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Footer */}
        <div className="p-2 bg-ops-900 border-t border-ops-700 flex items-center justify-between text-[11px] text-slate-500">
          <span>{filteredLogs.length} events streamed</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-ops-800 hover:bg-ops-750 text-slate-300 text-xs"
          >
            Close Terminal
          </button>
        </div>

      </div>
    </div>
  );
}

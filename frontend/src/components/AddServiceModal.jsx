import React, { useState } from 'react';
import { X, Radio, Plus } from 'lucide-react';
import { createService } from '../services/api';

export default function AddServiceModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [serviceType, setServiceType] = useState('HTTP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await createService({
        name: name.trim(),
        url: url.trim(),
        service_type: serviceType
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
      <div className="bg-ops-950 border border-ops-700 rounded w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-3.5 border-b border-ops-700 bg-ops-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Register Heartbeat Target
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] text-slate-400 uppercase mb-1">
              Target Identifier / Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Payment API"
              className="w-full bg-ops-900 border border-ops-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 uppercase mb-1">
              Probe Protocol
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setServiceType('HTTP')}
                className={`py-1.5 rounded text-xs border font-mono transition-all ${
                  serviceType === 'HTTP'
                    ? 'bg-ops-800 border-sky-500 text-white font-bold'
                    : 'bg-ops-900 border-ops-700 text-slate-400'
                }`}
              >
                HTTP / HTTPS Ping
              </button>
              <button
                type="button"
                onClick={() => setServiceType('TCP')}
                className={`py-1.5 rounded text-xs border font-mono transition-all ${
                  serviceType === 'TCP'
                    ? 'bg-ops-800 border-sky-500 text-white font-bold'
                    : 'bg-ops-900 border-ops-700 text-slate-400'
                }`}
              >
                TCP Port Probe
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 uppercase mb-1">
              {serviceType === 'HTTP' ? 'Target URL' : 'Host:Port Binding'}
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={serviceType === 'HTTP' ? 'http://127.0.0.1:8086 or https://api.site.com' : '127.0.0.1:3306 or db.internal:5432'}
              className="w-full bg-ops-900 border border-ops-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none"
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
              className="px-3.5 py-1 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white"
            >
              {loading ? 'Registering...' : 'REGISTER TARGET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

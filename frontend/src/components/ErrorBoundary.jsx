import React from 'react';
import { AlertOctagon, RotateCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("UI Render Crash caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070a0f] text-slate-200 flex items-center justify-center p-6 font-mono">
          <div className="max-w-xl w-full bg-ops-900 border border-rose-500/50 rounded p-6 shadow-2xl">
            <div className="flex items-center space-x-3 mb-3">
              <AlertOctagon className="w-6 h-6 text-rose-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Telemetry Dashboard Exception
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-sans mb-4">
              An unexpected render exception occurred. Check stacktrace below:
            </p>
            <div className="bg-[#040609] border border-ops-750 p-3 rounded text-[11px] text-rose-300 overflow-x-auto whitespace-pre-wrap mb-4">
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reload Workstation</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import MetricsOverview from './components/MetricsOverview';
import CpuRamCharts from './components/CpuRamCharts';
import ErrorLogStream from './components/ErrorLogStream';
import DockerContainerGrid from './components/DockerContainerGrid';
import KubernetesGrid from './components/KubernetesGrid';
import ContainerLogModal from './components/ContainerLogModal';
import ServicePingMonitor from './components/ServicePingMonitor';
import ProcessList from './components/ProcessList';
import AlertsPanel from './components/AlertsPanel';
import IncidentsPage from './components/IncidentsPage';
import AddServiceModal from './components/AddServiceModal';
import TestErrorModal from './components/TestErrorModal';

import { useWebSocket } from './hooks/useWebSocket';
import { 
  fetchMetrics, 
  fetchMetricsHistory, 
  fetchContainers, 
  fetchErrors, 
  fetchServices, 
  fetchAlerts 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTabState] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['dashboard', 'incidents', 'errors', 'containers', 'kubernetes', 'services', 'processes'].includes(hash) ? hash : 'dashboard';
  });
  const [searchQuery, setSearchQuery] = useState('');

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['dashboard', 'incidents', 'errors', 'containers', 'kubernetes', 'services', 'processes'].includes(hash)) {
        setActiveTabState(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  
  // Real-time WebSocket feed
  const { data: wsData, isConnected, lastUpdated } = useWebSocket();

  // Local state
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [containers, setContainers] = useState(null);
  const [errors, setErrors] = useState([]);
  const [services, setServices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);

  // Modals state
  const [isTestErrorModalOpen, setIsTestErrorModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [logModalContainer, setLogModalContainer] = useState(null);

  // Sync data from WebSocket tick
  useEffect(() => {
    if (wsData) {
      if (wsData.metrics) {
        setMetrics(wsData.metrics);
        setHistory(prev => {
          const newPoint = {
            timestamp: new Date().toISOString(),
            cpu_percent: wsData.metrics.cpu?.percent || 0,
            ram_percent: wsData.metrics.memory?.percent || 0,
            net_sent_bytes: wsData.metrics.network?.total_sent_bytes || 0,
            net_recv_bytes: wsData.metrics.network?.total_recv_bytes || 0,
          };
          const next = [...prev, newPoint];
          return next.slice(-60);
        });
      }
      if (wsData.containers) setContainers(wsData.containers);
      if (wsData.active_alerts) setAlerts(wsData.active_alerts);
    }
  }, [wsData]);

  // Initial load & Polling
  const loadInitialData = async () => {
    try {
      const [m, h, c, errs, s, activeAlts, allAlts] = await Promise.all([
        fetchMetrics().catch(() => null),
        fetchMetricsHistory(40).catch(() => []),
        fetchContainers().catch(() => null),
        fetchErrors().catch(() => ({ errors: [] })),
        fetchServices().catch(() => []),
        fetchAlerts('ACTIVE').catch(() => []),
        fetchAlerts().catch(() => [])
      ]);
      if (m) setMetrics(m);
      if (h) setHistory(h);
      if (c) setContainers(c);
      if (errs?.errors) setErrors(errs.errors);
      if (s) setServices(s);
      if (activeAlts) setAlerts(activeAlts);
      if (allAlts) setAllAlerts(allAlts);
    } catch (e) {
      console.error("Initial load error", e);
    }
  };

  const refreshAlertsAndErrors = async () => {
    try {
      const [errs, activeAlts, allAlts] = await Promise.all([
        fetchErrors().catch(() => ({ errors: [] })),
        fetchAlerts('ACTIVE').catch(() => []),
        fetchAlerts().catch(() => [])
      ]);
      if (errs?.errors) setErrors(errs.errors);
      if (activeAlts) setAlerts(activeAlts);
      if (allAlts) setAllAlerts(allAlts);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshContainers = async () => {
    try {
      const c = await fetchContainers();
      setContainers(c);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshServices = async () => {
    try {
      const s = await fetchServices();
      setServices(s);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGlobalRefresh = () => {
    loadInitialData();
  };

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(() => {
      refreshAlertsAndErrors();
      refreshServices();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation (1..7)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '1') setActiveTab('dashboard');
      if (e.key === '2') setActiveTab('incidents');
      if (e.key === '3') setActiveTab('errors');
      if (e.key === '4') setActiveTab('containers');
      if (e.key === '5') setActiveTab('kubernetes');
      if (e.key === '6') setActiveTab('services');
      if (e.key === '7') setActiveTab('processes');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Infrastructure Telemetry';
      case 'incidents': return 'Incidents & Alert Center';
      case 'errors': return 'Error Sentry & Logs';
      case 'containers': return 'Docker Engine Workloads';
      case 'kubernetes': return 'Kubernetes Cluster & Workloads';
      case 'services': return 'Heartbeat Uptime Probes';
      case 'processes': return 'Kernel Processes';
      default: return 'Overview';
    }
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-200 flex">
      
      {/* 1. Left Datadog/Grafana Style Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        hostInfo={metrics?.os ? { ...metrics.os, uptime_seconds: metrics.uptime_seconds } : null}
        activeAlertsCount={alerts.length}
        containerCount={containers?.stats}
        onOpenTestErrorModal={() => setIsTestErrorModalOpen(true)}
      />

      {/* 2. Main Workstation Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Command Bar */}
        <TopHeader
          activeTabTitle={getTabTitle()}
          hostname={metrics?.os?.hostname}
          onRefresh={handleGlobalRefresh}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenChaosModal={() => setIsTestErrorModalOpen(true)}
          activeAlertsCount={alerts.length}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-5 overflow-y-auto space-y-4 max-w-7xl w-full">
          
          {/* Active Alerts Compact Summary Banner (On Dashboard only) */}
          {activeTab === 'dashboard' && alerts.length > 0 && (
            <AlertsPanel 
              alerts={alerts} 
              onRefresh={refreshAlertsAndErrors} 
              onNavigateToIncidents={() => setActiveTab('incidents')} 
            />
          )}

          {/* TAB 1: Infrastructure Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <MetricsOverview
                metrics={metrics}
                containers={containers}
                errorCount={errors.length}
                activeAlertsCount={alerts.length}
                onTabChange={setActiveTab}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <CpuRamCharts history={history} />
                </div>
                <div className="lg:col-span-1">
                  <ProcessList />
                </div>
              </div>

              {/* Sentry Issue snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-slate-300 uppercase tracking-wider">
                    Recent Unresolved Error Stream
                  </span>
                  <button
                    onClick={() => setActiveTab('errors')}
                    className="text-sky-400 hover:underline"
                  >
                    Open Error Sentry ({errors.length}) →
                  </button>
                </div>
                <ErrorLogStream
                  errors={errors.slice(0, 6)}
                  onRefresh={refreshAlertsAndErrors}
                  onOpenTestErrorModal={() => setIsTestErrorModalOpen(true)}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Dedicated Separate Page for Incidents & All Acknowledged Alerts */}
          {activeTab === 'incidents' && (
            <IncidentsPage
              alerts={alerts}
              allAlerts={allAlerts}
              onRefresh={refreshAlertsAndErrors}
              onOpenChaosModal={() => setIsTestErrorModalOpen(true)}
            />
          )}

          {/* TAB 3: Error Sentry & Logs */}
          {activeTab === 'errors' && (
            <ErrorLogStream
              errors={errors}
              onRefresh={refreshAlertsAndErrors}
              onOpenTestErrorModal={() => setIsTestErrorModalOpen(true)}
            />
          )}

          {/* TAB 4: Containers */}
          {activeTab === 'containers' && (
            <DockerContainerGrid
              containersData={containers}
              onOpenLogsModal={(id, name) => setLogModalContainer({ id, name })}
              onRefresh={refreshContainers}
            />
          )}

          {/* TAB 5: Kubernetes Cluster Workloads */}
          {activeTab === 'kubernetes' && (
            <KubernetesGrid />
          )}

          {/* TAB 6: Services */}
          {activeTab === 'services' && (
            <ServicePingMonitor
              services={services}
              onRefresh={refreshServices}
              onOpenAddModal={() => setIsAddServiceModalOpen(true)}
            />
          )}

          {/* TAB 7: Process Inspector */}
          {activeTab === 'processes' && (
            <ProcessList />
          )}

        </main>

        {/* Precision Status Line Footer */}
        <footer className="h-8 border-t border-ops-700/60 bg-ops-900/80 px-6 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div className="flex items-center space-x-3">
            <span>SOCKET: {isConnected ? 'LIVE FEED' : 'RECONNECTING'}</span>
            <span>•</span>
            <span>LAST SYNC: {lastUpdated ? lastUpdated.toLocaleTimeString() : '--'}</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>CONTAINER: pulseops-server-monitor:8088</span>
            <span>•</span>
            <span className="text-slate-400">SHORTCUTS: [1..7] TAB NAVIGATION</span>
          </div>
        </footer>

      </div>

      {/* Modals */}
      {isTestErrorModalOpen && (
        <TestErrorModal
          onClose={() => setIsTestErrorModalOpen(false)}
          onSuccess={refreshAlertsAndErrors}
        />
      )}

      {isAddServiceModalOpen && (
        <AddServiceModal
          onClose={() => setIsAddServiceModalOpen(false)}
          onSuccess={refreshServices}
        />
      )}

      {logModalContainer && (
        <ContainerLogModal
          containerId={logModalContainer.id}
          containerName={logModalContainer.name}
          onClose={() => setLogModalContainer(null)}
        />
      )}

    </div>
  );
}

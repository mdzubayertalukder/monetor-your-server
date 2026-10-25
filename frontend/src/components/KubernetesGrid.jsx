import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Box, 
  RotateCw, 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Plus, 
  Minus, 
  Copy, 
  Check, 
  ExternalLink, 
  Server, 
  Cpu, 
  Layers, 
  FileText, 
  HelpCircle,
  X,
  Clock
} from 'lucide-react';
import { 
  fetchK8sOverview, 
  fetchK8sPodLogs, 
  restartK8sPod, 
  scaleK8sDeployment 
} from '../services/api';

export default function KubernetesGrid() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('pods'); // 'pods' | 'deployments' | 'nodes'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'running' | 'unhealthy'

  // Log Modal
  const [logModalPod, setLogModalPod] = useState(null);
  const [podLogs, setPodLogs] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [logPrevious, setLogPrevious] = useState(false);
  const [logTail, setLogTail] = useState(200);

  // Setup Guide Modal
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Action states
  const [actionLoadingPod, setActionLoadingPod] = useState(null);
  const [scalingDeployment, setScalingDeployment] = useState(null);

  const loadClusterData = async () => {
    try {
      setLoading(true);
      const res = await fetchK8sOverview();
      setData(res);
      setError(null);
    } catch (err) {
      console.error('K8s fetch error:', err);
      setError('Failed to query Kubernetes endpoint. Please verify cluster or API configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClusterData();
    const interval = setInterval(loadClusterData, 12000);
    return () => clearInterval(interval);
  }, []);

  // Handle Pod restart
  const handleRestartPod = async (pod) => {
    if (!window.confirm(`Are you sure you want to terminate and restart pod "${pod.name}" in namespace "${pod.namespace}"?`)) {
      return;
    }
    try {
      setActionLoadingPod(pod.name);
      await restartK8sPod(pod.namespace, pod.name);
      await loadClusterData();
    } catch (err) {
      alert(`Restart failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoadingPod(null);
    }
  };

  // Handle Deployment scale
  const handleScaleDeployment = async (dept, delta) => {
    const newReplicas = Math.max(0, (dept.replicas_desired || 0) + delta);
    try {
      setScalingDeployment(dept.name);
      await scaleK8sDeployment(dept.namespace, dept.name, newReplicas);
      await loadClusterData();
    } catch (err) {
      alert(`Scale failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setScalingDeployment(null);
    }
  };

  // Open Log Modal
  const openLogModal = async (pod, previous = false) => {
    setLogModalPod(pod);
    setLogPrevious(previous);
    setLogLoading(true);
    try {
      const res = await fetchK8sPodLogs(pod.namespace, pod.name, {
        tail: logTail,
        previous: previous
      });
      setPodLogs(res.logs || 'No logs received from container.');
    } catch (err) {
      setPodLogs(`[Log Fetch Error]: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLogLoading(false);
    }
  };

  const reloadPodLogs = async () => {
    if (!logModalPod) return;
    openLogModal(logModalPod, logPrevious);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Derived filtered Pods
  const pods = data?.pods || [];
  const filteredPods = pods.filter(pod => {
    const matchesNs = selectedNamespace === 'all' || pod.namespace === selectedNamespace;
    const matchesSearch = !searchQuery || 
      pod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pod.namespace.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pod.containers && pod.containers.some(c => c.image.toLowerCase().includes(searchQuery.toLowerCase())));
    
    let matchesStatus = true;
    if (statusFilter === 'running') matchesStatus = pod.status === 'Running';
    if (statusFilter === 'unhealthy') {
      matchesStatus = ['CrashLoopBackOff', 'OOMKilled', 'Failed', 'ImagePullBackOff', 'ErrImagePull', 'Error'].includes(pod.status);
    }

    return matchesNs && matchesSearch && matchesStatus;
  });

  // Derived filtered Deployments
  const deployments = data?.deployments || [];
  const filteredDeployments = deployments.filter(dept => {
    const matchesNs = selectedNamespace === 'all' || dept.namespace === selectedNamespace;
    const matchesSearch = !searchQuery || dept.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesNs && matchesSearch;
  });

  const stats = data?.stats || {
    total_nodes: 0,
    ready_nodes: 0,
    total_pods: 0,
    running_pods: 0,
    pending_pods: 0,
    failed_pods: 0,
    total_deployments: 0
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Cluster Status & KPI Header */}
      <div className="p-4 rounded-lg bg-ops-850/90 border border-ops-700/80 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-ops-700/50">
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-mono text-slate-100 uppercase tracking-wide">
                  Kubernetes Cluster Workloads
                </h2>
                
                {data?.connected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                    LIVE CLUSTER
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
                    PREVIEW DEMO MODE
                  </span>
                )}

                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-ops-800 text-slate-400 border border-ops-700">
                  {data?.server_version || 'v1.29'}
                </span>
              </div>

              <div className="text-xs font-mono text-slate-400 mt-0.5 flex items-center space-x-3">
                <span>Cluster: <strong className="text-slate-300">{data?.cluster_name || 'k8s-cluster.local'}</strong></span>
                <span>•</span>
                <span>Type: <span className="uppercase text-sky-400">{data?.cluster_type || 'standalone'}</span></span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="px-3 py-1.5 rounded bg-ops-800 hover:bg-ops-750 text-slate-300 hover:text-white border border-ops-700 text-xs font-mono flex items-center space-x-1.5 transition-colors"
              title="Show guide to connect K8s cluster or deploy manifests"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Connect Guide</span>
            </button>

            <button
              onClick={loadClusterData}
              disabled={loading}
              className="px-3 py-1.5 rounded bg-ops-800 hover:bg-ops-750 text-slate-300 hover:text-white border border-ops-700 text-xs font-mono flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

        </div>

        {/* Diagnostic Banner if Demo Mode */}
        {data?.is_mock && (
          <div className="mt-3 p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Notice:</strong> PulseOps is displaying simulated multi-tier microservice workloads. Mount <code className="bg-ops-900 px-1 py-0.5 rounded text-amber-300">~/.kube/config</code> or deploy to your cluster to switch to live telemetry.
              </span>
            </div>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-amber-400 hover:underline font-bold text-xs shrink-0 ml-3"
            >
              View Connection Manifests →
            </button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
          <div className="p-3 rounded bg-ops-900/80 border border-ops-700/60 font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Cluster Nodes</div>
            <div className="text-xl font-bold text-slate-100 mt-1">
              {stats.ready_nodes} <span className="text-xs text-slate-500 font-normal">/ {stats.total_nodes} Ready</span>
            </div>
          </div>

          <div className="p-3 rounded bg-ops-900/80 border border-ops-700/60 font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Pods</div>
            <div className="text-xl font-bold text-sky-400 mt-1">
              {stats.total_pods}
            </div>
          </div>

          <div className="p-3 rounded bg-ops-900/80 border border-ops-700/60 font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Running Pods</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {stats.running_pods}
            </div>
          </div>

          <div className="p-3 rounded bg-ops-900/80 border border-ops-700/60 font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">CrashLoop / Unhealthy</div>
            <div className={`text-xl font-bold mt-1 ${stats.failed_pods > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
              {stats.failed_pods}
            </div>
          </div>

          <div className="p-3 rounded bg-ops-900/80 border border-ops-700/60 font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Pending Pods</div>
            <div className="text-xl font-bold text-amber-300 mt-1">
              {stats.pending_pods}
            </div>
          </div>

          <div className="p-3 rounded bg-ops-900/80 border border-ops-700/60 font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Deployments</div>
            <div className="text-xl font-bold text-indigo-300 mt-1">
              {stats.total_deployments}
            </div>
          </div>
        </div>

      </div>

      {/* 2. Controls & Search Filter Bar */}
      <div className="p-3 rounded-lg bg-ops-850 border border-ops-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Navigation Tabs (Pods / Deployments / Nodes) */}
        <div className="flex items-center space-x-1 font-mono text-xs">
          <button
            onClick={() => setActiveSubTab('pods')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'pods'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-ops-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Pods ({pods.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('deployments')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'deployments'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-ops-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Deployments ({deployments.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('nodes')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'nodes'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-ops-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Nodes ({(data?.nodes || []).length})</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Namespace Selector */}
          <div className="flex items-center space-x-1.5 text-xs font-mono">
            <span className="text-slate-500 text-[11px] uppercase">Namespace:</span>
            <select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              className="bg-ops-900 border border-ops-700 text-slate-300 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Namespaces</option>
              {(data?.namespaces || []).map(ns => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </select>
          </div>

          {/* Pod Status Filter (Pods subtab only) */}
          {activeSubTab === 'pods' && (
            <div className="flex items-center space-x-1 bg-ops-900 p-0.5 rounded border border-ops-700 text-[11px] font-mono">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded ${statusFilter === 'all' ? 'bg-ops-750 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('running')}
                className={`px-2 py-0.5 rounded ${statusFilter === 'running' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Running
              </button>
              <button
                onClick={() => setStatusFilter('unhealthy')}
                className={`px-2 py-0.5 rounded ${statusFilter === 'unhealthy' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Unhealthy ({stats.failed_pods})
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeSubTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-ops-900 border border-ops-700 text-slate-200 rounded pl-8 pr-3 py-1 text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-44 md:w-56"
            />
          </div>

        </div>

      </div>

      {/* 3. Main Views */}
      
      {/* 3A. PODS TABLE VIEW */}
      {activeSubTab === 'pods' && (
        <div className="rounded-lg bg-ops-850 border border-ops-700/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-ops-900 text-slate-400 border-b border-ops-700/80 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Pod Name & Image</th>
                  <th className="py-2.5 px-3">Namespace</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Ready</th>
                  <th className="py-2.5 px-3">Restarts</th>
                  <th className="py-2.5 px-3">Node Placement</th>
                  <th className="py-2.5 px-3">Age</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ops-750/50">
                {filteredPods.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No matching Kubernetes pods found for the current query.
                    </td>
                  </tr>
                ) : (
                  filteredPods.map(pod => {
                    const isCrashLoop = pod.status === 'CrashLoopBackOff' || pod.status === 'OOMKilled' || pod.status.includes('Error');
                    const isRunning = pod.status === 'Running';
                    const isPending = pod.status === 'Pending' || pod.status === 'ContainerCreating';
                    const primaryContainer = pod.containers?.[0];

                    return (
                      <tr 
                        key={`${pod.namespace}-${pod.name}`}
                        className={`hover:bg-ops-800/60 transition-colors ${isCrashLoop ? 'bg-rose-950/15' : ''}`}
                      >
                        {/* Name & Image */}
                        <td className="py-3 px-4">
                          <div className="flex items-start space-x-2">
                            <Box className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isCrashLoop ? 'text-rose-400 animate-pulse' : (isRunning ? 'text-emerald-400' : 'text-amber-400')
                            }`} />
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-slate-200 truncate" title={pod.name}>
                                  {pod.name}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(pod.name, pod.name)}
                                  className="text-slate-500 hover:text-slate-300"
                                  title="Copy pod name"
                                >
                                  {copiedKey === pod.name ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                {primaryContainer?.image || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Namespace */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-ops-800 border border-ops-700 text-slate-300 text-[11px]">
                            {pod.namespace}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {isCrashLoop ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <XCircle className="w-3 h-3 mr-1 text-rose-400" />
                              {pod.status}
                            </span>
                          ) : isRunning ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                              Running
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
                              {pod.status}
                            </span>
                          )}
                        </td>

                        {/* Ready */}
                        <td className="py-3 px-3">
                          <span className={pod.ready.startsWith('0') ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                            {pod.ready}
                          </span>
                        </td>

                        {/* Restarts */}
                        <td className="py-3 px-3">
                          <span className={`font-bold ${pod.restarts > 5 ? 'text-rose-400' : (pod.restarts > 0 ? 'text-amber-400' : 'text-slate-400')}`}>
                            {pod.restarts}
                          </span>
                        </td>

                        {/* Node Placement */}
                        <td className="py-3 px-3">
                          <div className="text-slate-300">{pod.node}</div>
                          <div className="text-[10px] text-slate-500">{pod.ip}</div>
                        </td>

                        {/* Age */}
                        <td className="py-3 px-3 text-slate-400">
                          {pod.age || '--'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => openLogModal(pod, false)}
                              className="px-2 py-1 rounded bg-ops-800 hover:bg-ops-750 text-sky-400 border border-ops-700 hover:border-sky-500/40 text-xs font-mono flex items-center space-x-1 transition-colors"
                              title="Tail pod logs"
                            >
                              <Terminal className="w-3 h-3" />
                              <span>Logs</span>
                            </button>

                            <button
                              onClick={() => handleRestartPod(pod)}
                              disabled={actionLoadingPod === pod.name}
                              className="px-2 py-1 rounded bg-ops-800 hover:bg-ops-750 text-amber-300 hover:text-amber-200 border border-ops-700 hover:border-amber-500/40 text-xs font-mono flex items-center space-x-1 transition-colors disabled:opacity-50"
                              title="Delete and recreate pod"
                            >
                              <RotateCw className={`w-3 h-3 ${actionLoadingPod === pod.name ? 'animate-spin' : ''}`} />
                              <span>Restart</span>
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3B. DEPLOYMENTS TABLE VIEW */}
      {activeSubTab === 'deployments' && (
        <div className="rounded-lg bg-ops-850 border border-ops-700/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-ops-900 text-slate-400 border-b border-ops-700/80 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Deployment</th>
                  <th className="py-2.5 px-3">Namespace</th>
                  <th className="py-2.5 px-3">Desired</th>
                  <th className="py-2.5 px-3">Ready</th>
                  <th className="py-2.5 px-3">Available</th>
                  <th className="py-2.5 px-3">Image Tag</th>
                  <th className="py-2.5 px-4 text-right">Scale Replicas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ops-750/50">
                {filteredDeployments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No deployments found in cluster.
                    </td>
                  </tr>
                ) : (
                  filteredDeployments.map(dept => {
                    const isFullyReady = dept.replicas_ready === dept.replicas_desired && dept.replicas_desired > 0;

                    return (
                      <tr key={`${dept.namespace}-${dept.name}`} className="hover:bg-ops-800/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-200">
                          <div className="flex items-center space-x-2">
                            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>{dept.name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-ops-800 border border-ops-700 text-slate-300 text-[11px]">
                            {dept.namespace}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-200">
                          {dept.replicas_desired}
                        </td>

                        <td className="py-3 px-3">
                          <span className={isFullyReady ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                            {dept.replicas_ready}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-300">
                          {dept.replicas_available}
                        </td>

                        <td className="py-3 px-3 text-slate-400 truncate max-w-xs">
                          {dept.image}
                        </td>

                        {/* Scaling controls */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleScaleDeployment(dept, -1)}
                              disabled={scalingDeployment === dept.name || dept.replicas_desired <= 0}
                              className="w-7 h-7 rounded bg-ops-800 hover:bg-ops-750 border border-ops-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
                              title="Scale down (-1)"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <span className="w-8 text-center font-bold text-slate-200">
                              {dept.replicas_desired}
                            </span>

                            <button
                              onClick={() => handleScaleDeployment(dept, +1)}
                              disabled={scalingDeployment === dept.name}
                              className="w-7 h-7 rounded bg-ops-800 hover:bg-ops-750 border border-ops-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
                              title="Scale up (+1)"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3C. NODES TOPOLOGY VIEW */}
      {activeSubTab === 'nodes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.nodes || []).map(node => (
            <div 
              key={node.name}
              className="p-4 rounded-lg bg-ops-850 border border-ops-700/80 font-mono space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-ops-700/50">
                <div className="flex items-center space-x-2 min-w-0">
                  <Server className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="font-bold text-slate-200 truncate" title={node.name}>
                    {node.name}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  node.status === 'Ready' 
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {node.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">Roles:</span>
                  <div className="text-slate-300 mt-0.5">{node.roles.join(', ')}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">Internal IP:</span>
                  <div className="text-slate-300 mt-0.5">{node.internal_ip}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">CPU Allocatable:</span>
                  <div className="text-sky-300 mt-0.5">{node.cpu_allocatable} / {node.cpu_capacity}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">RAM Allocatable:</span>
                  <div className="text-sky-300 mt-0.5">{node.memory_allocatable} / {node.memory_capacity}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-ops-750 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Kubelet: {node.kubelet_version}</span>
                <span>Max Pods: {node.pods_capacity}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. MODAL: POD LOG VIEWER */}
      {logModalPod && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-ops-900 border border-ops-700 rounded-lg shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-ops-700/80 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span className="font-mono text-sm font-bold text-slate-200">
                  Pod Logs: {logModalPod.name}
                </span>
                <span className="px-2 py-0.5 rounded bg-ops-800 text-[11px] font-mono text-slate-400 border border-ops-700">
                  ns: {logModalPod.namespace}
                </span>
              </div>

              <button
                onClick={() => setLogModalPod(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar */}
            <div className="px-4 py-2 bg-ops-850 border-b border-ops-750 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={logPrevious}
                    onChange={(e) => {
                      setLogPrevious(e.target.checked);
                      openLogModal(logModalPod, e.target.checked);
                    }}
                    className="rounded bg-ops-900 border-ops-700 text-sky-500 focus:ring-0"
                  />
                  <span>Previous Instance (Crashed Container)</span>
                </label>

                <div className="flex items-center space-x-1">
                  <span className="text-slate-500">Tail:</span>
                  <select
                    value={logTail}
                    onChange={(e) => {
                      setLogTail(Number(e.target.value));
                      openLogModal(logModalPod, logPrevious);
                    }}
                    className="bg-ops-900 border border-ops-700 text-slate-300 rounded px-1.5 py-0.5 text-xs"
                  >
                    <option value={100}>100 lines</option>
                    <option value={200}>200 lines</option>
                    <option value={500}>500 lines</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={reloadPodLogs}
                  disabled={logLoading}
                  className="px-2.5 py-1 rounded bg-ops-800 hover:bg-ops-750 text-slate-200 border border-ops-700 flex items-center space-x-1"
                >
                  <RotateCw className={`w-3 h-3 ${logLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => copyToClipboard(podLogs, 'podLogs')}
                  className="px-2.5 py-1 rounded bg-ops-800 hover:bg-ops-750 text-slate-200 border border-ops-700 flex items-center space-x-1"
                >
                  {copiedKey === 'podLogs' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'podLogs' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Modal Body / Terminal */}
            <div className="p-4 flex-1 overflow-auto bg-[#06090e] font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
              {logLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-500 space-x-2">
                  <RotateCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Streaming pod logs from API...</span>
                </div>
              ) : (
                podLogs
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 border-t border-ops-700/80 bg-ops-900 flex items-center justify-between font-mono text-[11px] text-slate-500">
              <span>Status: {logModalPod.status} | Replicas: {logModalPod.ready}</span>
              <button
                onClick={() => setLogModalPod(null)}
                className="px-3 py-1 rounded bg-ops-800 hover:bg-ops-750 text-slate-300"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. MODAL: KUBERNETES SETUP & DEPLOY GUIDE */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-ops-900 border border-ops-700 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="px-5 py-4 border-b border-ops-700 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Boxes className="w-5 h-5 text-sky-400" />
                <h3 className="font-mono text-base font-bold text-slate-100">
                  Connect PulseOps to Kubernetes
                </h3>
              </div>
              <button onClick={() => setIsGuideOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs leading-relaxed text-slate-300">
              
              <div>
                <h4 className="text-sm font-bold text-sky-400 mb-1">Option 1: Deploy Directly Inside K8s (Recommended)</h4>
                <p className="text-slate-400 mb-2">
                  PulseOps automatically detects in-cluster ServiceAccount credentials and monitors the cluster with zero manual token configuration.
                </p>
                <div className="p-3 bg-black rounded border border-ops-700 text-emerald-400 relative group">
                  <code>kubectl apply -k ./k8s/</code>
                  <button
                    onClick={() => copyToClipboard('kubectl apply -k ./k8s/', 'k8s_apply')}
                    className="absolute right-2 top-2 p-1 rounded bg-ops-800 text-slate-300 hover:text-white"
                  >
                    {copiedKey === 'k8s_apply' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-sky-400 mb-1">Option 2: Docker Compose with Kubeconfig Mount</h4>
                <p className="text-slate-400 mb-2">
                  If running PulseOps in standalone Docker, mount your host's kubeconfig into the container:
                </p>
                <div className="p-3 bg-black rounded border border-ops-700 text-slate-300 relative">
                  <pre className="text-[11px] leading-tight">
{`services:
  pulseops:
    image: pulseops-monitor:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ~/.kube/config:/root/.kube/config:ro
    environment:
      - KUBECONFIG=/root/.kube/config`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`- ~/.kube/config:/root/.kube/config:ro`, 'vol_mount')}
                    className="absolute right-2 top-2 p-1 rounded bg-ops-800 text-slate-300 hover:text-white"
                  >
                    {copiedKey === 'vol_mount' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-ops-850 rounded border border-ops-700/80 text-slate-400">
                <span className="text-amber-300 font-bold">RBAC Permissions:</span> PulseOps requires read permissions on <code className="text-sky-300">nodes</code>, <code className="text-sky-300">pods</code>, <code className="text-sky-300">pods/log</code>, and <code className="text-sky-300">deployments</code>. All RBAC rules are pre-packaged in <code className="text-slate-200">k8s/rbac.yaml</code>.
              </div>

            </div>

            <div className="px-5 py-3 border-t border-ops-700 bg-ops-850 flex justify-end">
              <button
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold font-mono text-xs"
              >
                Got it
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

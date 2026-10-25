import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const fetchMetrics = () => api.get('/metrics/current').then(r => r.data);
export const fetchMetricsHistory = (limit = 60) => api.get(`/metrics/history?limit=${limit}`).then(r => r.data);
export const fetchProcesses = (limit = 10) => api.get(`/metrics/processes?limit=${limit}`).then(r => r.data);

export const fetchContainers = () => api.get('/containers').then(r => r.data);
export const fetchContainerLogs = (id, tail = 150) => api.get(`/containers/${id}/logs?tail=${tail}`).then(r => r.data);
export const restartContainer = (id) => api.post(`/containers/${id}/restart`).then(r => r.data);
export const stopContainer = (id) => api.post(`/containers/${id}/stop`).then(r => r.data);
export const startContainer = (id) => api.post(`/containers/${id}/start`).then(r => r.data);

export const fetchErrors = (params = {}) => api.get('/logs/errors', { params }).then(r => r.data);
export const triggerTestError = (payload) => api.post('/logs/test-error', payload).then(r => r.data);
export const resolveError = (id) => api.post(`/logs/${id}/resolve`).then(r => r.data);
export const clearErrors = () => api.delete('/logs').then(r => r.data);

export const fetchServices = () => api.get('/services').then(r => r.data);
export const createService = (data) => api.post('/services', data).then(r => r.data);
export const deleteService = (id) => api.delete(`/services/${id}`).then(r => r.data);
export const checkServices = () => api.post('/services/check').then(r => r.data);

export const fetchAlerts = (status) => api.get('/alerts', { params: status ? { status } : {} }).then(r => r.data);
export const resolveAlert = (id) => api.post(`/alerts/${id}/resolve`).then(r => r.data);
export const acknowledgeAllAlerts = () => api.post('/alerts/acknowledge-all').then(r => r.data);
export const clearAlertsHistory = () => api.delete('/alerts').then(r => r.data);

// Kubernetes Cluster & Workloads
export const fetchK8sOverview = () => api.get('/k8s/overview').then(r => r.data);
export const fetchK8sStatus = () => api.get('/k8s/status').then(r => r.data);
export const fetchK8sPods = (params = {}) => api.get('/k8s/pods', { params }).then(r => r.data);
export const fetchK8sPodLogs = (namespace, podName, params = {}) => 
  api.get(`/k8s/pods/${namespace}/${podName}/logs`, { params }).then(r => r.data);
export const restartK8sPod = (namespace, podName) => 
  api.post(`/k8s/pods/${namespace}/${podName}/restart`).then(r => r.data);
export const scaleK8sDeployment = (namespace, deploymentName, replicas) => 
  api.post(`/k8s/deployments/${namespace}/${deploymentName}/scale`, { replicas }).then(r => r.data);

export default api;

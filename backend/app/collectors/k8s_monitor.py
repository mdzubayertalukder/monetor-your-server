import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from kubernetes import client as k8s_client, config as k8s_config
    from kubernetes.client.rest import ApiException
    HAS_K8S_PKG = True
except ImportError:
    HAS_K8S_PKG = False
    ApiException = Exception

_k8s_initialized = False
_k8s_client_type = None  # "in_cluster" | "kubeconfig" | None
_k8s_init_error = None


def init_k8s_client() -> bool:
    """Attempts to configure Kubernetes client via in-cluster service account or kubeconfig."""
    global _k8s_initialized, _k8s_client_type, _k8s_init_error
    if not HAS_K8S_PKG:
        _k8s_init_error = "Python 'kubernetes' package is not installed"
        return False

    # 1. Try In-Cluster Config (when PulseOps runs inside a K8s Pod)
    try:
        k8s_config.load_incluster_config()
        _k8s_initialized = True
        _k8s_client_type = "in_cluster"
        _k8s_init_error = None
        logger.info("Kubernetes client initialized via in-cluster ServiceAccount")
        return True
    except Exception as in_cluster_err:
        pass

    # 2. Try Kubeconfig file (from KUBECONFIG env or ~/.kube/config)
    kubeconfig_path = os.getenv("KUBECONFIG", os.path.expanduser("~/.kube/config"))
    if os.path.exists(kubeconfig_path):
        try:
            k8s_config.load_kube_config(config_file=kubeconfig_path)
            _k8s_initialized = True
            _k8s_client_type = "kubeconfig"
            _k8s_init_error = None
            logger.info(f"Kubernetes client initialized via kubeconfig at {kubeconfig_path}")
            return True
        except Exception as kubeconfig_err:
            _k8s_init_error = f"Kubeconfig error at {kubeconfig_path}: {str(kubeconfig_err)}"
            logger.warning(_k8s_init_error)
            return False

    _k8s_init_error = f"No Kubernetes cluster found (no in-cluster token and {kubeconfig_path} does not exist)"
    return False


def get_mock_k8s_data() -> Dict[str, Any]:
    """Provides high-fidelity simulated cluster data so users can test K8s monitoring without an active cluster."""
    now_iso = datetime.utcnow().isoformat() + "Z"
    return {
        "connected": False,
        "is_mock": True,
        "cluster_type": "simulated",
        "cluster_name": "k8s-cluster-demo.local",
        "server_version": "v1.29.2",
        "diagnostics": {
            "has_library": HAS_K8S_PKG,
            "connection_type": None,
            "error_detail": _k8s_init_error or "Kubeconfig not mounted. Running in preview demo mode."
        },
        "stats": {
            "total_nodes": 3,
            "ready_nodes": 3,
            "total_pods": 9,
            "running_pods": 7,
            "pending_pods": 1,
            "failed_pods": 1,
            "total_deployments": 4,
            "namespaces_count": 4
        },
        "namespaces": ["default", "kube-system", "monitoring", "ecommerce-prod"],
        "nodes": [
            {
                "name": "node-master-01",
                "status": "Ready",
                "roles": ["control-plane"],
                "kubelet_version": "v1.29.2",
                "os_image": "Ubuntu 22.04.4 LTS",
                "kernel_version": "6.5.0-35-generic",
                "internal_ip": "10.0.1.10",
                "cpu_capacity": "4 cores",
                "cpu_allocatable": "3.8 cores",
                "memory_capacity": "16.0 GB",
                "memory_allocatable": "15.2 GB",
                "pods_capacity": 110,
                "created_at": "2026-09-15T08:00:00Z"
            },
            {
                "name": "node-worker-01",
                "status": "Ready",
                "roles": ["worker"],
                "kubelet_version": "v1.29.2",
                "os_image": "Ubuntu 22.04.4 LTS",
                "kernel_version": "6.5.0-35-generic",
                "internal_ip": "10.0.1.21",
                "cpu_capacity": "8 cores",
                "cpu_allocatable": "7.8 cores",
                "memory_capacity": "32.0 GB",
                "memory_allocatable": "31.1 GB",
                "pods_capacity": 110,
                "created_at": "2026-09-15T08:05:00Z"
            },
            {
                "name": "node-worker-02",
                "status": "Ready",
                "roles": ["worker"],
                "kubelet_version": "v1.29.2",
                "os_image": "Ubuntu 22.04.4 LTS",
                "kernel_version": "6.5.0-35-generic",
                "internal_ip": "10.0.1.22",
                "cpu_capacity": "8 cores",
                "cpu_allocatable": "7.8 cores",
                "memory_capacity": "32.0 GB",
                "memory_allocatable": "30.8 GB",
                "pods_capacity": 110,
                "created_at": "2026-09-15T08:05:00Z"
            }
        ],
        "pods": [
            {
                "name": "payment-gateway-7f89c6b45-abc12",
                "namespace": "ecommerce-prod",
                "status": "CrashLoopBackOff",
                "phase": "Running",
                "ready": "0/1",
                "restarts": 14,
                "node": "node-worker-01",
                "ip": "10.244.1.45",
                "age": "2h 45m",
                "created_at": now_iso,
                "containers": [
                    {
                        "name": "payment-api",
                        "image": "redis-queue-worker:v2.1.0",
                        "ready": False,
                        "restart_count": 14,
                        "state": "waiting",
                        "reason": "CrashLoopBackOff",
                        "message": "back-off 5m0s restarting failed container=payment-api pod=payment-gateway"
                    }
                ],
                "deployment": "payment-gateway"
            },
            {
                "name": "web-frontend-5b79878d8c-7x9p2",
                "namespace": "ecommerce-prod",
                "status": "Running",
                "phase": "Running",
                "ready": "1/1",
                "restarts": 0,
                "node": "node-worker-01",
                "ip": "10.244.1.46",
                "age": "1d 12h",
                "created_at": now_iso,
                "containers": [
                    {
                        "name": "frontend-nginx",
                        "image": "frontend-web:v1.4.2",
                        "ready": True,
                        "restart_count": 0,
                        "state": "running",
                        "reason": None,
                        "message": None
                    }
                ],
                "deployment": "web-frontend"
            },
            {
                "name": "web-frontend-5b79878d8c-q4m9k",
                "namespace": "ecommerce-prod",
                "status": "Running",
                "phase": "Running",
                "ready": "1/1",
                "restarts": 0,
                "node": "node-worker-02",
                "ip": "10.244.2.19",
                "age": "1d 12h",
                "created_at": now_iso,
                "containers": [
                    {
                        "name": "frontend-nginx",
                        "image": "frontend-web:v1.4.2",
                        "ready": True,
                        "restart_count": 0,
                        "state": "running",
                        "reason": None,
                        "message": None
                    }
                ],
                "deployment": "web-frontend"
            },
            {
                "name": "auth-service-6789b87df-k82zl",
                "namespace": "ecommerce-prod",
                "status": "Running",
                "phase": "Running",
                "ready": "2/2",
                "restarts": 1,
                "node": "node-worker-02",
                "ip": "10.244.2.20",
                "age": "3d 4h",
                "created_at": now_iso,
                "containers": [
                    {
                        "name": "auth-jwt",
                        "image": "auth-jwt:v3.0.1",
                        "ready": True,
                        "restart_count": 1,
                        "state": "running",
                        "reason": None,
                        "message": None
                    },
                    {
                        "name": "envoy-sidecar",
                        "image": "envoyproxy/envoy:v1.28.0",
                        "ready": True,
                        "restart_count": 0,
                        "state": "running",
                        "reason": None,
                        "message": None
                    }
                ],
                "deployment": "auth-service"
            },
            {
                "name": "inventory-indexer-c6d987-9j2kl",
                "namespace": "ecommerce-prod",
                "status": "Pending",
                "phase": "Pending",
                "ready": "0/1",
                "restarts": 0,
                "node": "node-worker-02",
                "ip": "10.244.2.25",
                "age": "12m",
                "created_at": now_iso,
                "containers": [
                    {
                        "name": "indexer",
                        "image": "inventory-indexer:v1.0.0",
                        "ready": False,
                        "restart_count": 0,
                        "state": "waiting",
                        "reason": "ContainerCreating",
                        "message": "Pulling image inventory-indexer:v1.0.0"
                    }
                ],
                "deployment": "inventory-indexer"
            },
            {
                "name": "coredns-768b85b76f-2v7k4",
                "namespace": "kube-system",
                "status": "Running",
                "phase": "Running",
                "ready": "1/1",
                "restarts": 0,
                "node": "node-master-01",
                "ip": "10.244.0.2",
                "age": "30d",
                "created_at": now_iso,
                "containers": [
                    {
                        "name": "coredns",
                        "image": "registry.k8s.io/coredns/coredns:v1.11.1",
                        "ready": True,
                        "restart_count": 0,
                        "state": "running",
                        "reason": None,
                        "message": None
                    }
                ],
                "deployment": "coredns"
            },
            {
                "name": "pulseops-monitor-84bd794c8-m7z2r",
                "namespace": "monitoring",
                "status": "Running",
                "phase": "Running",
                "ready": "1/1",
                "restarts": 0,
                "node": "node-worker-01",
                "ip": "10.244.1.88",
                "age": "5h 10m",
                "created_at": now_iso,
                "containers": [
                    {
                        "name": "pulseops",
                        "image": "pulseops-monitor:latest",
                        "ready": True,
                        "restart_count": 0,
                        "state": "running",
                        "reason": None,
                        "message": None
                    }
                ],
                "deployment": "pulseops-monitor"
            }
        ],
        "deployments": [
            {
                "name": "web-frontend",
                "namespace": "ecommerce-prod",
                "replicas_desired": 2,
                "replicas_ready": 2,
                "replicas_available": 2,
                "replicas_updated": 2,
                "image": "frontend-web:v1.4.2",
                "age": "14d"
            },
            {
                "name": "payment-gateway",
                "namespace": "ecommerce-prod",
                "replicas_desired": 1,
                "replicas_ready": 0,
                "replicas_available": 0,
                "replicas_updated": 1,
                "image": "redis-queue-worker:v2.1.0",
                "age": "5d"
            },
            {
                "name": "auth-service",
                "namespace": "ecommerce-prod",
                "replicas_desired": 1,
                "replicas_ready": 1,
                "replicas_available": 1,
                "replicas_updated": 1,
                "image": "auth-jwt:v3.0.1",
                "age": "20d"
            },
            {
                "name": "pulseops-monitor",
                "namespace": "monitoring",
                "replicas_desired": 1,
                "replicas_ready": 1,
                "replicas_available": 1,
                "replicas_updated": 1,
                "image": "pulseops-monitor:latest",
                "age": "1d"
            }
        ]
    }


def get_mock_pod_logs(namespace: str, pod_name: str) -> str:
    """Mock pod log generator for demonstration and crash reproduction."""
    if "payment" in pod_name:
        return f"""[2026-10-25 00:10:02 UTC] [INFO] Starting payment-gateway worker on pod {pod_name}...
[2026-10-25 00:10:03 UTC] [INFO] Loading configuration from ConfigMap /etc/config/app.json
[2026-10-25 00:10:03 UTC] [INFO] Connecting to payment gateway upstream at https://api.stripe.com/v1...
[2026-10-25 00:10:05 UTC] [ERROR] ConnectionRefusedError: Failed to connect to Redis cluster redis-cluster.ecommerce-prod.svc.cluster.local:6379
[2026-10-25 00:10:05 UTC] [FATAL] Critical dependency unavailable. Terminating worker with exit status 1.
[2026-10-25 00:10:06 UTC] [Kubelet] Container payment-api failed livenessProbe: HTTP probe failed with statuscode: 503
[2026-10-25 00:10:07 UTC] [Kubelet] Back-off restarting failed container payment-api in pod {pod_name}_{namespace}
CrashLoopBackOff: Container exited with error code 1."""
    
    return f"""[2026-10-25 00:15:20 UTC] [INFO] Service {pod_name} running in namespace {namespace}
[2026-10-25 00:15:21 UTC] [INFO] HTTP Server listening on 0.0.0.0:8080 (healthcheck OK)
[2026-10-25 00:18:42 UTC] [INFO] GET /api/v1/health 200 OK (0.84ms)
[2026-10-25 00:22:10 UTC] [INFO] Handled incoming ingress request latency=1.2ms status=200
[2026-10-25 00:25:00 UTC] [INFO] Memory footprint: 48.2MB / 256MB limit. Everything healthy."""


def get_k8s_overview() -> Dict[str, Any]:
    """Retrieves live Kubernetes cluster telemetry or falls back cleanly to mock data."""
    global _k8s_initialized, _k8s_client_type, _k8s_init_error

    if not _k8s_initialized:
        if not init_k8s_client():
            return get_mock_k8s_data()

    try:
        core_api = k8s_client.CoreV1Api()
        apps_api = k8s_client.AppsV1Api()
        version_api = k8s_client.VersionApi()

        # Cluster version
        try:
            ver_info = version_api.get_code()
            server_version = f"v{ver_info.major}.{ver_info.minor}"
        except Exception:
            server_version = "v1.x (Connected)"

        # 1. Nodes
        nodes_list = []
        raw_nodes = core_api.list_node(timeout_seconds=5).items
        for n in raw_nodes:
            roles = []
            for label, val in (n.metadata.labels or {}).items():
                if "node-role.kubernetes.io/" in label:
                    roles.append(label.split("/")[-1])
            if not roles:
                roles = ["worker"]

            # Ready condition
            is_ready = False
            for cond in (n.status.conditions or []):
                if cond.type == "Ready" and cond.status == "True":
                    is_ready = True
                    break

            cap = n.status.capacity or {}
            alloc = n.status.allocatable or {}
            node_info = n.status.node_info

            nodes_list.append({
                "name": n.metadata.name,
                "status": "Ready" if is_ready else "NotReady",
                "roles": roles,
                "kubelet_version": getattr(node_info, "kubelet_version", "unknown"),
                "os_image": getattr(node_info, "os_image", "unknown"),
                "kernel_version": getattr(node_info, "kernel_version", "unknown"),
                "internal_ip": next((addr.address for addr in (n.status.addresses or []) if addr.type == "InternalIP"), "N/A"),
                "cpu_capacity": cap.get("cpu", "N/A"),
                "cpu_allocatable": alloc.get("cpu", "N/A"),
                "memory_capacity": cap.get("memory", "N/A"),
                "memory_allocatable": alloc.get("memory", "N/A"),
                "pods_capacity": int(cap.get("pods", 110)),
                "created_at": n.metadata.creation_timestamp.isoformat() if n.metadata.creation_timestamp else ""
            })

        # 2. Namespaces
        raw_namespaces = core_api.list_namespace(timeout_seconds=5).items
        namespaces = [ns.metadata.name for ns in raw_namespaces]

        # 3. Pods
        pods_list = []
        raw_pods = core_api.list_pod_for_all_namespaces(timeout_seconds=8).items
        for p in raw_pods:
            c_statuses = p.status.container_statuses or []
            total_containers = len(p.spec.containers)
            ready_containers = sum(1 for cs in c_statuses if cs.ready)
            restarts = sum(cs.restart_count for cs in c_statuses)

            # Determine dominant state reason (e.g. CrashLoopBackOff, OOMKilled, ImagePullBackOff)
            status_str = p.status.phase or "Unknown"
            containers_details = []
            for cs in c_statuses:
                state_name = "running" if cs.state.running else ("waiting" if cs.state.waiting else "terminated")
                reason = None
                message = None
                if cs.state.waiting:
                    reason = cs.state.waiting.reason
                    message = cs.state.waiting.message
                    if reason in ["CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull", "CreateContainerConfigError"]:
                        status_str = reason
                elif cs.state.terminated:
                    reason = cs.state.terminated.reason
                    message = cs.state.terminated.message
                    if reason == "OOMKilled":
                        status_str = "OOMKilled"
                    elif cs.state.terminated.exit_code != 0:
                        status_str = f"Error ({cs.state.terminated.exit_code})"

                containers_details.append({
                    "name": cs.name,
                    "image": cs.image,
                    "ready": cs.ready,
                    "restart_count": cs.restart_count,
                    "state": state_name,
                    "reason": reason,
                    "message": message
                })

            created = p.metadata.creation_timestamp
            age_str = ""
            if created:
                delta = datetime.now(created.tzinfo) - created
                hours, rem = divmod(int(delta.total_seconds()), 3600)
                mins = rem // 60
                if delta.days > 0:
                    age_str = f"{delta.days}d {hours % 24}h"
                elif hours > 0:
                    age_str = f"{hours}h {mins}m"
                else:
                    age_str = f"{mins}m"

            deployment_name = None
            if p.metadata.owner_references:
                owner = p.metadata.owner_references[0]
                if owner.kind == "ReplicaSet":
                    # Strip replica set suffix to get deployment name
                    parts = owner.name.rsplit("-", 1)
                    deployment_name = parts[0] if len(parts) > 1 else owner.name
                else:
                    deployment_name = owner.name

            pods_list.append({
                "name": p.metadata.name,
                "namespace": p.metadata.namespace,
                "status": status_str,
                "phase": p.status.phase,
                "ready": f"{ready_containers}/{total_containers}",
                "restarts": restarts,
                "node": p.spec.node_name or "Unassigned",
                "ip": p.status.pod_ip or "N/A",
                "age": age_str,
                "created_at": created.isoformat() if created else "",
                "containers": containers_details,
                "deployment": deployment_name
            })

        # 4. Deployments
        deployments_list = []
        raw_deployments = apps_api.list_deployment_for_all_namespaces(timeout_seconds=5).items
        for d in raw_deployments:
            containers = d.spec.template.spec.containers
            img = containers[0].image if containers else "N/A"
            deployments_list.append({
                "name": d.metadata.name,
                "namespace": d.metadata.namespace,
                "replicas_desired": d.spec.replicas or 0,
                "replicas_ready": d.status.ready_replicas or 0,
                "replicas_available": d.status.available_replicas or 0,
                "replicas_updated": d.status.updated_replicas or 0,
                "image": img,
                "age": ""
            })

        # Aggregate Stats
        ready_nodes_count = sum(1 for n in nodes_list if n["status"] == "Ready")
        running_pods_count = sum(1 for p in pods_list if p["status"] == "Running")
        pending_pods_count = sum(1 for p in pods_list if p["status"] == "Pending")
        failed_pods_count = sum(1 for p in pods_list if p["status"] in ["CrashLoopBackOff", "OOMKilled", "Failed", "Error"])

        return {
            "connected": True,
            "is_mock": False,
            "cluster_type": _k8s_client_type or "active",
            "cluster_name": getattr(core_api.api_client.configuration, "host", "k8s-cluster"),
            "server_version": server_version,
            "diagnostics": {
                "has_library": True,
                "connection_type": _k8s_client_type,
                "error_detail": None
            },
            "stats": {
                "total_nodes": len(nodes_list),
                "ready_nodes": ready_nodes_count,
                "total_pods": len(pods_list),
                "running_pods": running_pods_count,
                "pending_pods": pending_pods_count,
                "failed_pods": failed_pods_count,
                "total_deployments": len(deployments_list),
                "namespaces_count": len(namespaces)
            },
            "namespaces": namespaces,
            "nodes": nodes_list,
            "pods": pods_list,
            "deployments": deployments_list
        }

    except Exception as e:
        logger.error(f"Error querying live Kubernetes cluster: {e}")
        # Return fallback with error description
        mock = get_mock_k8s_data()
        mock["diagnostics"]["error_detail"] = f"Cluster query error: {str(e)}"
        return mock


def get_pod_logs(namespace: str, pod_name: str, container: Optional[str] = None, tail_lines: int = 200, previous: bool = False) -> str:
    """Fetches real-time pod logs from K8s API or mock generator."""
    if not _k8s_initialized:
        return get_mock_pod_logs(namespace, pod_name)

    try:
        core_api = k8s_client.CoreV1Api()
        kwargs = {
            "name": pod_name,
            "namespace": namespace,
            "tail_lines": tail_lines,
            "previous": previous
        }
        if container:
            kwargs["container"] = container
        return core_api.read_namespaced_pod_log(**kwargs)
    except Exception as e:
        logger.warning(f"Failed to fetch logs for {namespace}/{pod_name}: {e}")
        return f"[K8s API Error] Could not retrieve logs for pod '{pod_name}' in namespace '{namespace}': {str(e)}"


def restart_pod(namespace: str, pod_name: str) -> Dict[str, Any]:
    """Restarts a pod by deleting it, allowing the ReplicaSet/Deployment controller to spin up a new healthy replica."""
    if not _k8s_initialized:
        return {
            "success": True,
            "message": f"[Demo Mode] Simulated restart signal sent to pod {pod_name} in {namespace}. Pod will cycle.",
            "pod": pod_name,
            "namespace": namespace
        }

    try:
        core_api = k8s_client.CoreV1Api()
        core_api.delete_namespaced_pod(name=pod_name, namespace=namespace)
        return {
            "success": True,
            "message": f"Pod {pod_name} successfully terminated. Controller will recreate replacement replica.",
            "pod": pod_name,
            "namespace": namespace
        }
    except Exception as e:
        logger.error(f"Failed to delete pod {namespace}/{pod_name}: {e}")
        return {
            "success": False,
            "error": str(e),
            "pod": pod_name,
            "namespace": namespace
        }


def scale_deployment(namespace: str, deployment_name: str, replicas: int) -> Dict[str, Any]:
    """Scales a deployment up or down."""
    if replicas < 0 or replicas > 50:
        return {"success": False, "error": "Replicas count must be between 0 and 50"}

    if not _k8s_initialized:
        return {
            "success": True,
            "message": f"[Demo Mode] Scaled deployment {deployment_name} in {namespace} to {replicas} replicas.",
            "deployment": deployment_name,
            "replicas": replicas
        }

    try:
        apps_api = k8s_client.AppsV1Api()
        body = {"spec": {"replicas": replicas}}
        apps_api.patch_namespaced_deployment_scale(name=deployment_name, namespace=namespace, body=body)
        return {
            "success": True,
            "message": f"Deployment {deployment_name} scaled to {replicas} replicas.",
            "deployment": deployment_name,
            "replicas": replicas
        }
    except Exception as e:
        logger.error(f"Failed to scale deployment {namespace}/{deployment_name}: {e}")
        return {
            "success": False,
            "error": str(e),
            "deployment": deployment_name
        }

export interface K8sConfigMaps {
    name: string;
    data: number;
    age: string;
}

export interface K8sCronJobs {
    name: string;
}

export interface K8sDaemonSets {
    name: string;
}

export interface K8sDeployments {
    name: string;
    ready: string;
    upToDate: string;
    available: string;
    age: string;
}

export interface K8sJobs {
    name: string;
}

export interface k8sNodes {
    name: string;
    status: string;
    roles: string;
    age: string;
    version: string;
}

export interface K8sPod { 
    name: string;
    ready: string;
    status: string;
    restarts: string;
    age: string;
}

export interface K8sServiceAccounts {
    name: string;
    secrets: number;
    age: string;
}

export interface K8sServices {
    name: string;
    type: string;
    clusterIP: string;
    externalIP: string;
    ports: string;
    age: string;
}


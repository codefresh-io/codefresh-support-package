import { ClientProviderChain, KubeConfigRestClient, KubectlRawRestClient } from '@cloudydeno/kubernetes-client';
import { AppsV1Api } from '@cloudydeno/kubernetes-apis/apps/v1';
import { BatchV1Api } from '@cloudydeno/kubernetes-apis/batch/v1';
import { CoreV1Api } from '@cloudydeno/kubernetes-apis/core/v1';
import { StorageV1Api } from '@cloudydeno/kubernetes-apis/storage.k8s.io/v1';
import { ApiextensionsV1Api } from '@cloudydeno/kubernetes-apis/apiextensions.k8s.io/v1';

const kubeProviderChain = new ClientProviderChain([
    ['KubeConfig', () => KubeConfigRestClient.readKubeConfig()],
    ['InCluster', () => KubeConfigRestClient.forInCluster()],
    ['KubectlProxy', () => KubeConfigRestClient.forKubectlProxy()],
    ['KubectlRaw', () => Promise.resolve(new KubectlRawRestClient())],
]);

export const kubeConfig = await kubeProviderChain.getClient();

export const appsApi = new AppsV1Api(kubeConfig);
export const batchApi = new BatchV1Api(kubeConfig);
export const coreApi = new CoreV1Api(kubeConfig);
export const crdApi = new ApiextensionsV1Api(kubeConfig);
export const storageApi = new StorageV1Api(kubeConfig);

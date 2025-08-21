import { autoDetectClient } from '@cloudydeno/kubernetes-client';
import { AppsV1Api } from '@cloudydeno/kubernetes-apis/apps/v1';
import { BatchV1Api } from '@cloudydeno/kubernetes-apis/batch/v1';
import { CoreV1Api, Pod } from '@cloudydeno/kubernetes-apis/core/v1';
import { StorageV1Api } from '@cloudydeno/kubernetes-apis/storage.k8s.io/v1';
import { ApiextensionsV1Api } from '@cloudydeno/kubernetes-apis/apiextensions.k8s.io/v1';

const kubeConfig = await autoDetectClient();
const appsApi = new AppsV1Api(kubeConfig);
const batchApi = new BatchV1Api(kubeConfig);
const coreApi = new CoreV1Api(kubeConfig);
const crdApi = new ApiextensionsV1Api(kubeConfig);
const storageApi = new StorageV1Api(kubeConfig);

export class K8s {
    async selectNamespace() {
        const namespaces = (await coreApi.getNamespaceList()).items.map((namespace) => namespace.metadata?.name);

        namespaces.forEach((namespace, index) => {
            console.log(`${index + 1}. ${namespace}`);
        });

        let selection;
        do {
            selection = Number(prompt('\nWhich Namespace are we using? (Number): '));
            if (isNaN(selection) || selection < 1 || selection > namespaces.length) {
                console.log('Invalid selection. Please enter a number corresponding to one of the listed namespaces.');
            }
        } while (isNaN(selection) || selection < 1 || selection > namespaces.length);

        return namespaces[selection - 1];
    }

    async getPodLogs(pod: Pod) {
        const podName = pod.metadata?.name;
        const namespace = pod.metadata?.namespace;
        const containers = pod.spec?.containers.map((container) => container.name);
        const logs: Record<string, string> = {};

        try {
            if (!podName || !namespace || !containers) {
                throw new Error('Pod is missing required metadata or container specifications');
            }
            for (const container of containers) {
                try {
                    logs[container] = await coreApi
                        .namespace(namespace)
                        .getPodLog(podName, { container: container, timestamps: true });
                } catch (error) {
                    logs[container] = error instanceof Error
                        ? `Error: ${error.message}`
                        : `Unknown error: ${String(error)}`;
                }
            }
        } catch (error) {
            console.warn(error);
        }

        return logs;
    }

    async getCrd(type: string, namespace: string) {
        try {
            const crd = await crdApi.getCustomResourceDefinition(type);

            const path = `/apis/${crd.spec.group}/${
                crd.spec.versions.find((v) => v.served)?.name
            }/namespaces/${namespace}/${crd.spec.names.plural}`;

            const response = await kubeConfig.performRequest({
                method: 'GET',
                path: path,
                expectJson: true,
            });
            return response;
        } catch (_error) {
            return null;
        }
    }

    async getSortedEvents(namespace: string) {
        try {
            const events = await coreApi.namespace(namespace).getEventList();
            events.items = events.items.sort((a, b) => {
                const timeA = a.metadata?.creationTimestamp;
                const timeB = b.metadata?.creationTimestamp;

                // Handle missing timestamps - put them at the end
                if (!timeA && !timeB) return 0;
                if (!timeA) return 1;
                if (!timeB) return -1;

                // Convert to Date objects and subtract
                return new Date(timeA).getTime() - new Date(timeB).getTime();
            });
            return events;
        } catch (error) {
            if (error instanceof Error) {
                console.warn(`Failed to fetch events: ${error.message}`);
            }
            return { items: [] }; // Return empty events list
        }
    }

    getResources(namespace: string) {
        const k8sResourceTypes = {
            'configmaps': () => coreApi.namespace(namespace).getConfigMapList(),
            'cronjobs.batch': () => batchApi.namespace(namespace).getCronJobList(),
            'daemonsets.apps': () => appsApi.namespace(namespace).getDaemonSetList(),
            'deployments.apps': () => appsApi.namespace(namespace).getDeploymentList(),
            'events.k8s.io': () => this.getSortedEvents(namespace),
            'jobs.batch': () => batchApi.namespace(namespace).getJobList(),
            'nodes': () => coreApi.getNodeList(),
            'pods': () => coreApi.namespace(namespace).getPodList(),
            'serviceaccounts': () => coreApi.namespace(namespace).getServiceAccountList(),
            'services': () => coreApi.namespace(namespace).getServiceList(),
            'statefulsets.apps': () => appsApi.namespace(namespace).getStatefulSetList(),
            'persistentvolumeclaims': () =>
                coreApi.namespace(namespace).getPersistentVolumeClaimList({
                    labelSelector: 'io.codefresh.accountName',
                }),
            'persistentvolumes': () => coreApi.getPersistentVolumeList({ labelSelector: 'io.codefresh.accountName' }),
            'storageclasses.storage.k8s.io': () => storageApi.getStorageClassList(),
            'products.codefresh.io': () => this.getCrd('products.codefresh.io', namespace),
            'promotionflows.codefresh.io': () => this.getCrd('products.codefresh.io', namespace),
            'promotionpolicies.codefresh.io': () => this.getCrd('promotionflows.codefresh.io', namespace),
            'promotiontemplates.codefresh.io': () => this.getCrd('promotiontemplates.codefresh.io', namespace),
            'restrictedgitsources.codefresh.io': () => this.getCrd('restrictedgitsources.codefresh.io', namespace),
            'analysisruns.argoproj.io': () => this.getCrd('analysisruns.argoproj.io', namespace),
            'analysistemplates.argoproj.io': () => this.getCrd('analysistemplates.argoproj.io', namespace),
            'applications.argoproj.io': () => this.getCrd('applications.argoproj.io', namespace),
            'applicationsets.argoproj.io': () => this.getCrd('applicationsets.argoproj.io', namespace),
            'appprojects.argoproj.io': () => this.getCrd('appprojects.argoproj.io', namespace),
            'eventbus.argoproj.io': () => this.getCrd('eventbus.argoproj.io', namespace),
            'eventsources.argoproj.io': () => this.getCrd('eventsources.argoproj.io', namespace),
            'experiments.argoproj.io': () => this.getCrd('experiments.argoproj.io', namespace),
            'rollouts.argoproj.io': () => this.getCrd('rollouts.argoproj.io', namespace),
            'sensors.argoproj.io': () => this.getCrd('sensors.argoproj.io', namespace),
        };

        return k8sResourceTypes;
    }
}

import { autoDetectClient } from '@cloudydeno/kubernetes-client';
import { AppsV1Api } from '@cloudydeno/kubernetes-apis/apps/v1';
import { BatchV1Api } from '@cloudydeno/kubernetes-apis/batch/v1';
import { CoreV1Api } from '@cloudydeno/kubernetes-apis/core/v1';
import { StorageV1Api } from '@cloudydeno/kubernetes-apis/storage.k8s.io/v1';
import { ApiextensionsV1Api } from '@cloudydeno/kubernetes-apis/apiextensions.k8s.io/v1';

const kubeConfig = await autoDetectClient();
const appsApi = new AppsV1Api(kubeConfig);
const batchApi = new BatchV1Api(kubeConfig);
const coreApi = new CoreV1Api(kubeConfig);
const crdApi = new ApiextensionsV1Api(kubeConfig);
const storageApi = new StorageV1Api(kubeConfig);

export async function selectNamespace() {
    const namespaces = (await coreApi.getNamespaceList()).items.map((namespace) => namespace.metadata.name);

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

export async function getPodLogs(pod) {
    const podName = pod.metadata.name;
    const namespace = pod.metadata.namespace;

    const containers = pod.spec.containers.map((container) => container.name);

    const logs = {};
    for (const container of containers) {
        try {
            logs[container] = await coreApi
                .namespace(namespace)
                .getPodLog(podName, { container: container, timestamps: true });
        } catch (error) {
            logs[container] = error;
        }
    }
    return logs;
}

async function getCrd(type, namespace) {
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

async function getSortedEvents(namespace) {
    try {
        const events = await coreApi.namespace(namespace).getEventList();
        events.items = events.items.sort((a, b) =>
            new Date(a.metadata.creationTimestamp) - new Date(b.metadata.creationTimestamp)
        );
        return events;
    } catch (error) {
        console.warn(`Failed to fetch events: ${error.message}`);
        return { items: [] }; // Return empty events list
    }
}

export function getResources(namespace) {
    const k8sResourceTypes = {
        'configmaps': () => coreApi.namespace(namespace).getConfigMapList(),
        'cronjobs.batch': () => batchApi.namespace(namespace).getCronJobList(),
        'daemonsets.apps': () => appsApi.namespace(namespace).getDaemonSetList(),
        'deployments.apps': () => appsApi.namespace(namespace).getDeploymentList(),
        'events.k8s.io': () => getSortedEvents(namespace),
        'jobs.batch': () => batchApi.namespace(namespace).getJobList(),
        'nodes': () => coreApi.getNodeList(),
        'pods': () => coreApi.namespace(namespace).getPodList(),
        'serviceaccounts': () => coreApi.namespace(namespace).getServiceAccountList(),
        'services': () => coreApi.namespace(namespace).getServiceList(),
        'statefulsets.apps': () => appsApi.namespace(namespace).getStatefulSetList(),
        'persistentvolumeclaims': () =>
            coreApi.namespace(namespace).getPersistentVolumeClaimList({ labelSelector: 'io.codefresh.accountName' }),
        'persistentvolumes': () => coreApi.getPersistentVolumeList({ labelSelector: 'io.codefresh.accountName' }),
        'storageclasses.storage.k8s.io': () => storageApi.getStorageClassList(),
        'products.codefresh.io': () => getCrd('products.codefresh.io', namespace),
        'promotionflows.codefresh.io': () => getCrd('products.codefresh.io', namespace),
        'promotionpolicies.codefresh.io': () => getCrd('promotionflows.codefresh.io', namespace),
        'promotiontemplates.codefresh.io': () => getCrd('promotiontemplates.codefresh.io', namespace),
        'restrictedgitsources.codefresh.io': () => getCrd('restrictedgitsources.codefresh.io', namespace),
        'analysisruns.argoproj.io': () => getCrd('analysisruns.argoproj.io', namespace),
        'analysistemplates.argoproj.io': () => getCrd('analysistemplates.argoproj.io', namespace),
        'applications.argoproj.io': () => getCrd('applications.argoproj.io', namespace),
        'applicationsets.argoproj.io': () => getCrd('applicationsets.argoproj.io', namespace),
        'appprojects.argoproj.io': () => getCrd('appprojects.argoproj.io', namespace),
        'eventbus.argoproj.io': () => getCrd('eventbus.argoproj.io', namespace),
        'eventsources.argoproj.io': () => getCrd('eventsources.argoproj.io', namespace),
        'experiments.argoproj.io': () => getCrd('experiments.argoproj.io', namespace),
        'rollouts.argoproj.io': () => getCrd('rollouts.argoproj.io', namespace),
        'sensors.argoproj.io': () => getCrd('sensors.argoproj.io', namespace),
    };

    return k8sResourceTypes;
}

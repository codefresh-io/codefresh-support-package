import { appsApi, batchApi, coreApi, crdApi, kubeConfig, storageApi } from './client.ts';

async function getCrd(type: string, namespace: string) {
    try {
        const crd = await crdApi.getCustomResourceDefinition(type);
        const path = `/apis/${crd.spec.group}/${
            crd.spec.versions.find((v) => v.served)?.name
        }/namespaces/${namespace}/${crd.spec.names.plural}`;

        return await kubeConfig.performRequest({ method: 'GET', path, expectJson: true });
    } catch {
        return null;
    }
}

async function getSortedEvents(namespace: string) {
    try {
        const events = await coreApi.namespace(namespace).getEventList();
        events.items = events.items.sort((a, b) => {
            const timeA = a.metadata?.creationTimestamp;
            const timeB = b.metadata?.creationTimestamp;
            if (!timeA && !timeB) return 0;
            if (!timeA) return 1;
            if (!timeB) return -1;
            return new Date(timeA).getTime() - new Date(timeB).getTime();
        });
        return events;
    } catch {
        return { items: [] };
    }
}

export function getResources(namespace: string) {
    return {
        'configmaps': () => coreApi.namespace(namespace).getConfigMapList(),
        'cronjobs.batch': () => batchApi.namespace(namespace).getCronJobList(),
        'daemonsets.apps': () => appsApi.namespace(namespace).getDaemonSetList(),
        'deployments.apps': () => appsApi.namespace(namespace).getDeploymentList(),
        'events.k8s.io': () => getSortedEvents(namespace),
        'jobs.batch': () => batchApi.namespace(namespace).getJobList(),
        'nodes': () => coreApi.getNodeList(),
        'pods': () => coreApi.namespace(namespace).getPodList(),
        'secrets': () => coreApi.namespace(namespace).getSecretList(),
        'serviceaccounts': () => coreApi.namespace(namespace).getServiceAccountList(),
        'services': () => coreApi.namespace(namespace).getServiceList(),
        'statefulsets.apps': () => appsApi.namespace(namespace).getStatefulSetList(),
        'persistentvolumeclaims': () =>
            coreApi.namespace(namespace).getPersistentVolumeClaimList({ labelSelector: 'io.codefresh.accountName' }),
        'persistentvolumes': () => coreApi.getPersistentVolumeList({ labelSelector: 'io.codefresh.accountName' }),
        'storageclasses.storage.k8s.io': () => storageApi.getStorageClassList(),
        'products.codefresh.io': () => getCrd('products.codefresh.io', namespace),
        'promotionflows.codefresh.io': () => getCrd('promotionflows.codefresh.io', namespace),
        'promotionpolicies.codefresh.io': () => getCrd('promotionpolicies.codefresh.io', namespace),
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
}

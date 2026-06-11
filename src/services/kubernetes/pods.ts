import { coreApi } from './client.ts';
import { Pod } from '@cloudydeno/kubernetes-apis/core/v1';

export async function getPodLogs(pod: Pod) {
    const podName = pod.metadata?.name;
    const namespace = pod.metadata?.namespace;
    const containers = pod.spec?.containers.map((c) => c.name);
    const logs: Record<string, string> = {};

    if (!podName || !namespace || !containers) {
        throw new Error('Pod is missing required metadata or container specifications');
    }

    for (const container of containers) {
        try {
            logs[container] = await coreApi
                .namespace(namespace)
                .getPodLog(podName, { container, timestamps: true });
        } catch (error) {
            logs[container] = error instanceof Error ? `Error: ${error.message}` : `Unknown error: ${String(error)}`;
        }
    }

    return logs;
}

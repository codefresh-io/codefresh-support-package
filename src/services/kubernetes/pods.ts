import { logger } from '../../utils/logger.ts';
import { coreApi } from './client.ts';
import { Pod } from '@cloudydeno/kubernetes-apis/core/v1';

export async function getPodLogs(pod: Pod) {
    const podName = pod.metadata?.name;
    const namespace = pod.metadata?.namespace;
    const containers = pod.spec?.containers.map((c) => c.name);
    const logs: Record<string, string> = {};

    logger.info(`Fetching logs for pod: ${podName}`);

    if (!podName || !namespace || !containers) {
        logger.error('Pod is missing required metadata or container specifications');
        throw new Error('Pod is missing required metadata or container specifications');
    }

    for (const container of containers) {
        try {
            logger.info(`Fetching logs for container: ${container} in pod: ${podName}`);
            logs[container] = await coreApi
                .namespace(namespace)
                .getPodLog(podName, { container, timestamps: true });
        } catch (error) {
            logger.error(
                `Error fetching logs for container: ${container} in pod: ${podName}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            logs[container] = error instanceof Error ? `Error: ${error.message}` : `Unknown error: ${String(error)}`;
        }
    }

    return logs;
}

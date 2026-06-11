import { getSemaphore } from '@henrygd/semaphore';
import { getClusterVersion } from './cluster.ts';
import { getPodLogs } from './pods.ts';
import { writeYaml } from '../../utils/files.ts';

export async function collectData(dirPath: string, k8sResources: Record<string, () => Promise<any>>) {
    const clusterVersion = await getClusterVersion();
    await writeYaml(clusterVersion, 'cluster_version', dirPath);

    for (const [k8sType, fetcher] of Object.entries(k8sResources)) {
        try {
            console.log(`Processing Data for ${k8sType}`);
            const resources = await fetcher();

            if (!resources?.items?.length) continue;

            const semaphore = getSemaphore(k8sType, 10);

            if (k8sType === 'secrets') {
                for (const secret of resources.items) {
                    await semaphore.acquire();
                    try {
                        delete secret.metadata.managedFields;
                        delete secret.metadata.annotations?.['kubectl.kubernetes.io/last-applied-configuration'];
                        secret.data = { 'REDACTED': 'Data is redacted by the support package' };
                        await writeYaml(secret, `${secret.metadata.name}_get`, `${dirPath}/${k8sType}`);
                    } finally {
                        semaphore.release();
                    }
                }
                continue;
            }

            if (k8sType === 'pods') {
                for (const pod of resources.items) {
                    await semaphore.acquire();
                    try {
                        delete pod.metadata.managedFields;
                        await writeYaml(pod, `spec_${pod.metadata.name}`, `${dirPath}/${k8sType}/${pod.metadata.name}`);

                        console.log(`Gathering logs for pod ${pod.metadata.name}`);
                        const logs = await getPodLogs(pod);
                        for (const [containerName, logData] of Object.entries(logs)) {
                            await Deno.writeTextFile(
                                `${dirPath}/${k8sType}/${pod.metadata.name}/log_${containerName}.log`,
                                logData as string,
                            );
                        }
                    } finally {
                        semaphore.release();
                    }
                }
                continue;
            }

            if (k8sType === 'events.k8s.io') {
                const header = 'LAST SEEN\tTYPE\tREASON\tOBJECT\tMESSAGE\n';
                const rows = resources.items.map((event: any) => {
                    const lastSeen = event.metadata.creationTimestamp
                        ? new Date(event.metadata.creationTimestamp).toISOString()
                        : 'Invalid Date';
                    return `${lastSeen}\t${event.type ?? 'Unknown'}\t${
                        event.reason ?? 'Unknown'
                    }\t${event.involvedObject.kind}/${event.involvedObject.name}\t${event.message ?? 'No message'}`;
                });
                await Deno.writeTextFile(`${dirPath}/${k8sType}.csv`, header + rows.join('\n'));
                continue;
            }

            await Promise.all(resources.items.map(async (data: any) => {
                await semaphore.acquire();
                try {
                    delete data.metadata.managedFields;
                    await writeYaml(data, `${data.metadata.name}_get`, `${dirPath}/${k8sType}`);
                } finally {
                    semaphore.release();
                }
            }));
        } catch (error) {
            if (error instanceof Error) {
                console.warn(`Failed to fetch ${k8sType}: ${error.message}`);
            }
        }
    }
}

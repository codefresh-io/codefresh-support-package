import { stringify as toYaml } from '@std/yaml';
import { getSemaphore } from '@henrygd/semaphore';
import { K8s } from '../logic/k8s.ts';
import { logger } from './mod.ts';

export class Utils {
    constructor() {
        logger.info('Utils class instance created');
    }

    async writeYaml(data: any, name: string, dirPath: string) {
        logger.info(`Writing YAML file: ${dirPath}/${name}.yaml`);
        await Deno.mkdir(dirPath, { recursive: true });
        const filePath = `${dirPath}/${name}.yaml`;
        await Deno.writeTextFile(filePath, toYaml(data, { skipInvalid: true }));
    }

    async preparePackage(dirPath: string, reType: string) {
        logger.info('Starting to prepare the support package');
        try {
            const supportPackageZip = `${dirPath}-${reType}.tar.gz`;
            console.log('Preparing the Support Package');
            logger.info(`Preparing the Support Package at ${dirPath}-${reType}.tar.gz`);
            const command = new Deno.Command('tar', {
                args: ['-czf', supportPackageZip, dirPath],
            });
            const { code, stderr } = await command.output();

            if (code !== 0) {
                logger.error(new TextDecoder().decode(stderr));
                throw new Error(`Failed to create tar.gz file: ${supportPackageZip}. \n ${stderr}`);
            }
            console.log('Cleaning up temp directory');
            logger.info('Cleaning up temp directory');
            await Deno.remove(dirPath, { recursive: true });
            console.log(`\nPlease attach ${supportPackageZip} to your support ticket.`);
            logger.info(`\nPlease attach ${supportPackageZip} to your support ticket.`);
        } catch (error) {
            console.error(error);
            logger.error(error);
            console.error(`\nPlease manually compress the directory ${dirPath} and attach it to the support ticket.`);
            logger.error(`\nPlease manually compress the directory ${dirPath} and attach it to the support ticket.`);
        }
    }

    async processData(dirPath: string, k8sResources: Record<string, () => Promise<any>>) {
        console.log('Processing and Saving Data');
        logger.info('Processing and Saving Data');
        const k8s = new K8s();

        const clusterVersion = await k8s.getClusterVersion();
        await this.writeYaml(clusterVersion, 'cluster_version', dirPath);

        for (const [k8sType, fetcher] of Object.entries(k8sResources)) {
            try {
                console.log(`Processing Data for ${k8sType}`);
                logger.info(`Processing Data for ${k8sType}`);
                const resources = await fetcher();

                if (!resources || !resources.items || resources.items.length === 0) {
                    continue;
                }

                const semaphore = getSemaphore(k8sType, 10);

                if (k8sType == 'pods') {
                    for (const pod of resources.items) {
                        await semaphore.acquire();
                        try {
                            delete pod.metadata.managedFields;

                            await this.writeYaml(
                                pod,
                                `spec_${pod.metadata.name}`,
                                `${dirPath}/${k8sType}/${pod.metadata.name}`,
                            );

                            const logs = await k8s.getPodLogs(pod);
                            console.log(`Gathering logs for pod ${pod.metadata.name}`);
                            logger.info(`Gathering logs for pod ${pod.metadata.name}`);
                            for (const [containerName, logData] of Object.entries(logs)) {
                                await Deno.writeTextFile(
                                    `${dirPath}/${k8sType}/${pod.metadata.name}/log_${containerName}.log`,
                                    logData,
                                );
                            }
                        } finally {
                            semaphore.release();
                        }
                    }
                    continue;
                }

                if (k8sType == 'events.k8s.io') {
                    const formattedEvents = resources.items.map((event: any) => {
                        const lastSeen = event.metadata.creationTimestamp
                            ? new Date(event.metadata.creationTimestamp).toISOString()
                            : 'Invalid Date';
                        const type = event.type || 'Unknown';
                        const reason = event.reason || 'Unknown';
                        const object = `${event.involvedObject.kind}/${event.involvedObject.name}`;
                        const message = event.message || 'No message';

                        return `${lastSeen}\t${type}\t${reason}\t${object}\t${message}`;
                    });

                    const header = 'LAST SEEN\tTYPE\tREASON\tOBJECT\tMESSAGE\n';
                    const content = header + formattedEvents.join('\n');

                    await Deno.writeTextFile(`${dirPath}/${k8sType}.csv`, content);

                    continue;
                }

                await Promise.all(resources.items.map(async (data: any) => {
                    await semaphore.acquire();
                    try {
                        delete data.metadata.managedFields;
                        await this.writeYaml(data, `${data.metadata.name}_get`, `${dirPath}/${k8sType}`);
                    } finally {
                        semaphore.release();
                    }
                }));
            } catch (error) {
                if (error instanceof Error) {
                    console.warn(`Failed to fetch ${k8sType}: ${error.message}`);
                    logger.warn(`Failed to fetch ${k8sType}: ${error.message}`);
                    continue;
                } else {
                    continue;
                }
            }
        }
    }
}

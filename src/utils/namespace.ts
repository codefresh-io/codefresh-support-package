import { coreApi } from '../services/kubernetes/client.ts';
import { logger } from './logger.ts';

export async function selectNamespace(): Promise<string> {
    logger.info('Fetching namespaces from the Kubernetes cluster');
    const namespaces = (await coreApi.getNamespaceList())
        .items
        .map((ns) => ns.metadata?.name)
        .filter(Boolean) as string[];

    namespaces.forEach((ns, i) => {
        console.log(`${i + 1}. ${ns}`);
        logger.info(`${i + 1}: ${ns}`);
    });

    let selection: number;
    do {
        selection = Number(prompt('\nWhich Namespace are we using? (Number): '));
        logger.info(`User selected namespace option: ${selection}`);
        if (isNaN(selection) || selection < 1 || selection > namespaces.length) {
            console.warn('Invalid selection. Please enter a number corresponding to one of the listed namespaces.');
            logger.warn(
                `Invalid selection for namespace. User input must be a number corresponding to one of the listed namespaces. user input: ${selection}`,
            );
        }
    } while (isNaN(selection) || selection < 1 || selection > namespaces.length);

    logger.info(`User selected namespace: ${namespaces[selection - 1]}`);
    return namespaces[selection - 1];
}

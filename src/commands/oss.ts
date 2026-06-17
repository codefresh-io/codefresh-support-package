import { Command } from '@cliffy/command';
import { DIR_PATH, logger } from '../utils/logger.ts';
import { getResources } from '../services/kubernetes/resources.ts';
import { collectData } from '../services/kubernetes/collector.ts';
import { selectNamespace } from '../utils/namespace.ts';
import { preparePackage } from '../utils/files.ts';

export const ossCommand = new Command()
    .description('Collect data for the Open Source ArgoCD')
    .option('-n, --namespace <namespace:string>', 'The namespace where the OSS ArgoCD is installed')
    .action(async (options: { namespace?: string }) => {
        logger.info('Starting data collection for OSS ArgoCD');
        let namespace = options.namespace;

        if (!namespace) {
            logger.info('No namespace provided. Prompting user to select a namespace.');
            namespace = await selectNamespace();
        }

        console.log(`Gathering data in the '${namespace}' namespace for OSS ArgoCD`);
        logger.info(`Gathering data in the '${namespace}' namespace for OSS ArgoCD`);
        const k8sResources = getResources(namespace);
        await collectData(DIR_PATH, k8sResources);
        await preparePackage(DIR_PATH);
    });

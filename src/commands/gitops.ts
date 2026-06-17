import { Command } from '@cliffy/command';
import { DIR_PATH, logger } from '../utils/logger.ts';
import { getResources } from '../services/kubernetes/resources.ts';
import { collectData } from '../services/kubernetes/collector.ts';
import { selectNamespace } from '../utils/namespace.ts';
import { preparePackage } from '../utils/files.ts';

export const gitopsCommand = new Command()
    .description('Collect data for the Codefresh GitOps Runtime')
    .option('-n, --namespace <namespace:string>', 'The namespace where the GitOps Runtime is installed')
    .action(async (options: { namespace?: string }) => {
        logger.info('Starting data collection for GitOps Runtime');

        let namespace = options.namespace;

        if (!namespace) {
            logger.info('No namespace provided. Prompting user to select a namespace.');
            namespace = await selectNamespace();
        }

        console.log(`Gathering data in the '${namespace}' namespace for the GitOps Runtime`);
        logger.info(`Gathering data in the '${namespace}' namespace for the GitOps Runtime`);
        const k8sResources = getResources(namespace);
        await collectData(DIR_PATH, k8sResources);
        await preparePackage(DIR_PATH, 'gitops');
    });

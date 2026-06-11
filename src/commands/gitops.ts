import { Command } from '@cliffy/command';
import { getResources } from '../services/kubernetes/resources.ts';
import { collectData } from '../services/kubernetes/collector.ts';
import { selectNamespace } from '../utils/select-namespace.ts';
import { createDirPath, preparePackage } from '../utils/files.ts';

export const gitopsCommand = new Command()
    .description('Collect data for the Codefresh GitOps Runtime')
    .option('-n, --namespace <namespace:string>', 'The namespace where the GitOps Runtime is installed')
    .action(async (options: { namespace?: string }) => {
        let namespace = options.namespace;

        if (!namespace) namespace = await selectNamespace();

        const dirPath = createDirPath('gitops');
        console.log(`Gathering data in the '${namespace}' namespace for the GitOps Runtime`);
        const k8sResources = getResources(namespace);
        await collectData(dirPath, k8sResources);
        await preparePackage(dirPath);
    });

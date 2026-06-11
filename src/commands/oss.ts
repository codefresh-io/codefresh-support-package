import { Command } from '@cliffy/command';
import { getResources } from '../services/kubernetes/resources.ts';
import { collectData } from '../services/kubernetes/collector.ts';
import { selectNamespace } from '../utils/select-namespace.ts';
import { createDirPath, preparePackage } from '../utils/files.ts';

export const ossCommand = new Command()
    .description('Collect data for the Open Source ArgoCD')
    .option('-n, --namespace <namespace:string>', 'The namespace where the OSS ArgoCD is installed')
    .action(async (options: { namespace?: string }) => {
        let namespace = options.namespace;

        if (!namespace) namespace = await selectNamespace();

        const dirPath = createDirPath('oss');
        console.log(`Gathering data in the '${namespace}' namespace for OSS ArgoCD`);
        const k8sResources = getResources(namespace);
        await collectData(dirPath, k8sResources);
        await preparePackage(dirPath);
    });

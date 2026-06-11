import { Command } from '@cliffy/command';
import { getCredentials } from '../services/codefresh/client.ts';
import {
    getSystemAccounts,
    getSystemFeatureFlags,
    getSystemRuntimes,
    getSystemTotalUsers,
} from '../services/codefresh/system.ts';
import { getResources } from '../services/kubernetes/resources.ts';
import { collectData } from '../services/kubernetes/collector.ts';
import { selectNamespace } from '../utils/select-namespace.ts';
import { createDirPath, preparePackage, writeYaml } from '../utils/files.ts';

const SAAS_URL = 'https://g.codefresh.io/api';

export const onpremCommand = new Command()
    .description('Collect data for the Codefresh OnPrem Installation')
    .option('-n, --namespace <namespace:string>', 'The namespace where Codefresh OnPrem is installed')
    .action(async (options: { namespace?: string }) => {
        let namespace = options.namespace;

        const dirPath = createDirPath('onprem');
        const cfCreds = await getCredentials();

        if (cfCreds?.baseUrl === SAAS_URL) {
            console.error(
                'Cannot gather On-Prem data for Codefresh SaaS. If you need to gather data for Codefresh On-Prem, please update your ./cfconfig context (or Envs) to point to an On-Prem instance.',
            );
            console.error('For Codefresh SaaS, use "pipelines" or "gitops" commands.');
            Deno.exit(1);
        }

        if (!namespace) namespace = await selectNamespace();

        if (cfCreds) {
            const dataFetchers = [
                { name: 'OnPrem_Accounts', fetcher: () => getSystemAccounts(cfCreds) },
                { name: 'OnPrem_Runtimes', fetcher: () => getSystemRuntimes(cfCreds) },
                { name: 'OnPrem_Feature_Flags', fetcher: () => getSystemFeatureFlags(cfCreds) },
                { name: 'OnPrem_Total_Users', fetcher: () => getSystemTotalUsers(cfCreds) },
            ];

            for (const { name, fetcher } of dataFetchers) {
                try {
                    const data = await fetcher();
                    await writeYaml(data, name, dirPath);
                } catch (error) {
                    console.error(`Failed to fetch or write ${name}:\n${error}`);
                }
            }
        }

        console.log(`Gathering data in the '${namespace}' namespace for Codefresh OnPrem`);
        const k8sResources = getResources(namespace);
        await collectData(dirPath, k8sResources);
        await preparePackage(dirPath);
    });

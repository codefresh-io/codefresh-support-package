import { Command } from '@cliffy/command';
import { getCredentials } from '../services/codefresh/client.ts';
import { getAccountRuntimes, getAccountRuntimeSpec } from '../services/codefresh/runtimes.ts';
import { getResources } from '../services/kubernetes/resources.ts';
import { collectData } from '../services/kubernetes/collector.ts';
import { selectNamespace } from '../utils/select-namespace.ts';
import { createDirPath, preparePackage, writeYaml } from '../utils/files.ts';

export const pipelinesCommand = new Command()
    .description('Collect data for the Codefresh Pipelines Runtime')
    .option('-n, --namespace <namespace:string>', 'The namespace where the Pipelines Runtime is installed')
    .option('-r, --runtime <runtime:string>', 'The name of the Pipelines Runtime')
    .action(async (options: { namespace?: string; runtime?: string }) => {
        let namespace = options.namespace;
        const runtime = options.runtime;

        if (!namespace) namespace = await selectNamespace();

        const dirPath = createDirPath('pipelines');
        const cfCreds = await getCredentials();

        if (cfCreds) {
            if (!runtime) {
                const runtimes = await getAccountRuntimes(cfCreds);

                if (runtimes.length !== 0) {
                    runtimes.forEach((re: any, index: number) => {
                        console.log(`${index + 1}. ${re.metadata.name}`);
                    });

                    let selection: number;
                    do {
                        selection = Number(prompt('\nWhich Pipelines Runtime Are We Working With? (Number): '));
                        if (isNaN(selection) || selection < 1 || selection > runtimes.length) {
                            console.warn(
                                'Invalid selection. Please enter a number corresponding to one of the listed runtimes.',
                            );
                        }
                    } while (isNaN(selection) || selection < 1 || selection > runtimes.length);

                    const reSpec = runtimes[selection - 1];
                    await writeYaml(reSpec, 'Runtime_Spec', dirPath);
                }
            } else {
                const reSpec = await getAccountRuntimeSpec(cfCreds, runtime);
                await writeYaml(reSpec, 'Runtime_Spec', dirPath);
            }
        }

        console.log(`Gathering data in the '${namespace}' namespace for Pipelines Runtime`);
        const k8sResources = getResources(namespace);
        await collectData(dirPath, k8sResources);
        await preparePackage(dirPath);
    });

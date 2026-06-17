import { Command } from '@cliffy/command';
import { DIR_PATH, logger } from '../utils/logger.ts';
import { getCredentials } from '../services/codefresh/client.ts';
import { getAccountRuntimes, getAccountRuntimeSpec } from '../services/codefresh/runtimes.ts';
import { getResources } from '../services/kubernetes/resources.ts';
import { collectData } from '../services/kubernetes/collector.ts';
import { selectNamespace } from '../utils/namespace.ts';
import { preparePackage, writeYaml } from '../utils/files.ts';

export const pipelinesCommand = new Command()
    .description('Collect data for the Codefresh Pipelines Runtime')
    .option('-n, --namespace <namespace:string>', 'The namespace where the Pipelines Runtime is installed')
    .option('-r, --runtime <runtime:string>', 'The name of the Pipelines Runtime')
    .action(async (options: { namespace?: string; runtime?: string }) => {
        let namespace = options.namespace;
        const runtime = options.runtime;

        if (!namespace) {
            logger.info('No namespace provided. Prompting user to select a namespace.');
            namespace = await selectNamespace();
        }

        const cfCreds = await getCredentials();

        if (cfCreds) {
            logger.info('Fetching Pipelines Runtime information using Codefresh API credentials');
            if (!runtime) {
                logger.info(
                    'No runtime provided. Fetching list of runtimes for account and prompting user to select one.',
                );
                const runtimes = await getAccountRuntimes(cfCreds);

                if (runtimes.length !== 0) {
                    runtimes.forEach((re: any, index: number) => {
                        console.log(`${index + 1}. ${re.metadata.name}`);
                    });

                    let selection: number;
                    do {
                        selection = Number(prompt('\nWhich Pipelines Runtime Are We Working With? (Number): '));
                        logger.info(`User selected runtime option: ${selection}`);
                        if (isNaN(selection) || selection < 1 || selection > runtimes.length) {
                            console.warn(
                                'Invalid selection. Please enter a number corresponding to one of the listed runtimes.',
                            );
                            logger.warn(
                                `Invalid selection for runtime. User input must be a number corresponding to one of the listed runtimes. user input: ${selection}`,
                            );
                        }
                    } while (isNaN(selection) || selection < 1 || selection > runtimes.length);

                    const reSpec = runtimes[selection - 1];
                    logger.info(`User selected runtime: ${reSpec.metadata.name}`);
                    await writeYaml(reSpec, 'Runtime_Spec', DIR_PATH);
                    logger.info(`Successfully wrote runtime spec for ${reSpec.metadata.name} to file`);
                }
            } else {
                logger.info(`Runtime provided via CLI option: ${runtime}. Fetching runtime spec for ${runtime}`);
                const reSpec = await getAccountRuntimeSpec(cfCreds, runtime);
                await writeYaml(reSpec, 'Runtime_Spec', DIR_PATH);
                logger.info(`Successfully wrote runtime spec for ${runtime} to file`);
            }
        }

        console.log(`Gathering data in the '${namespace}' namespace for Pipelines Runtime`);
        logger.info(`Gathering data in the '${namespace}' namespace for Pipelines Runtime`);
        const k8sResources = getResources(namespace);
        await collectData(DIR_PATH, k8sResources);
        await preparePackage(DIR_PATH);
    });

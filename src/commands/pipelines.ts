import { Codefresh, K8s } from '../logic/mod.ts';
import { DIR_PATH, logger, Utils } from '../utils/mod.ts';

export async function pipelinesCMD(namespace?: string, runtime?: string) {
    logger.info(`Starting Pipelines data collection...`);
    const cf = new Codefresh();
    const k8s = new K8s();
    const utils = new Utils();
    const cfCreds = cf.getCredentials();

    if (!namespace) {
        const selected = await k8s.selectNamespace();
        namespace = selected;
    }

    if (cfCreds) {
        if (!runtime) {
            const runtimes = await cf.getAccountRuntimes(cfCreds);

            if (runtimes.length !== 0) {
                runtimes.forEach((re: any, index: number) => {
                    logger.info(`${index + 1}. ${re.metadata.name}`);
                });
                let selection;
                do {
                    selection = Number(prompt('\nWhich Pipelines Runtime Are We Working With? (Number): '));
                    if (isNaN(selection) || selection < 1 || selection > runtimes.length) {
                        console.warn(
                            'Invalid selection. Please enter a number corresponding to one of the listed runtimes.',
                        );
                        logger.warn(
                            'Invalid selection. Please enter a number corresponding to one of the listed runtimes.',
                        );
                    }
                } while (isNaN(selection) || selection < 1 || selection > runtimes.length);

                const reSpec = runtimes[selection - 1];
                await utils.writeYaml(reSpec, 'Runtime_Spec', DIR_PATH);
            }
        } else {
            const reSpec = await cf.getAccountRuntimeSpec(cfCreds, runtime);
            await utils.writeYaml(reSpec, 'Runtime_Spec', DIR_PATH);
        }
    }

    console.log(`Gathering data in the '${namespace}' namespace for Pipelines Runtime`);
    logger.info(`Gathering data in the '${namespace}' namespace for Pipelines Runtime`);
    const k8sResources = k8s.getResources(namespace);
    await utils.processData(DIR_PATH, k8sResources);
    await utils.preparePackage(DIR_PATH, 'pipelines');
}

import { getResources, selectNamespace } from './logic/k8s.js';
import { preparePackage, processData, writeYaml } from './logic/core.js';
import { getAccountRuntimes, getCodefreshCredentials, getRuntimeSpec } from './logic/codefresh.js';

export async function pipelines(namespace, runtime) {
    const dirPath = `./cf-support-pipelines-${Math.floor(Date.now() / 1000)}`;
    const cfCreds = getCodefreshCredentials();

    if (!namespace) {
        const selected = await selectNamespace();
        namespace = selected;
    }

    if (cfCreds) {
        if (!runtime) {
            const runtimes = await getAccountRuntimes(cfCreds);

            if (runtimes.length !== 0) {
                runtimes.forEach((re, index) => {
                    console.log(`${index + 1}. ${re.metadata.name}`);
                });
                let selection;
                do {
                    selection = Number(prompt('\nWhich Pipelines Runtime Are We Working With? (Number): '));
                    if (isNaN(selection) || selection < 1 || selection > runtimes.length) {
                        console.log(
                            'Invalid selection. Please enter a number corresponding to one of the listed runtimes.',
                        );
                    }
                } while (isNaN(selection) || selection < 1 || selection > runtimes.length);

                const reSpec = runtimes[selection - 1];
                await writeYaml(reSpec, 'Runtime_Spec', dirPath);
            }
        } else {
            const reSpec = await getRuntimeSpec(cfCreds, runtime);
            await writeYaml(reSpec, 'Runtime_Spec', dirPath);
        }
    }

    console.log(`Gathering data in the '${namespace}' namespace for Pipelines Runtime`);
    const k8sResources = getResources(namespace);
    await processData(dirPath, k8sResources);
    await preparePackage(dirPath);
}

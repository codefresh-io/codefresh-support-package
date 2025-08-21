import { preparePackage, processData, writeYaml } from '../logic/utils.ts';
import { Codefresh, K8s } from '../logic/mod.ts';

export async function pipelinesCMD(namespace, runtime) {
    const cf = new Codefresh();
    const k8s = new K8s();
    const dirPath = `./cf-support-pipelines-${
        new Date().toISOString().replace(/[:.]/g, '-').replace(/\.\d{3}Z$/, 'Z')
    }`;
    const cfCreds = cf.getCredentials();

    if (!namespace) {
        const selected = await k8s.selectNamespace();
        namespace = selected;
    }

    if (cfCreds) {
        if (!runtime) {
            const runtimes = await cf.getAccountRuntimes(cfCreds);

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
            const reSpec = await cf.getRuntimeSpec(cfCreds, runtime);
            await writeYaml(reSpec, 'Runtime_Spec', dirPath);
        }
    }

    console.log(`Gathering data in the '${namespace}' namespace for Pipelines Runtime`);
    const k8sResources = k8s.getResources(namespace);
    await processData(dirPath, k8sResources);
    await preparePackage(dirPath);
}

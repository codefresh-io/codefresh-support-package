import { K8s } from '../logic/mod.ts';
import { logger, Utils } from '../utils/mod.ts';

export async function gitopsCMD(namespace?: string, dirPath?: string) {
    logger.info(`Starting GitOps data collection...`);
    const k8s = new K8s();
    const utils = new Utils();
    if (!namespace) {
        const selected = await k8s.selectNamespace();
        namespace = selected;
    }

    logger.info(`Gathering data in the '${namespace}' namespace for the GitOps Runtime`);
    const k8sResources = k8s.getResources(namespace);
    await utils.processData(dirPath ?? './cf-support', k8sResources);
    await utils.preparePackage(dirPath ?? './cf-support', 'gitops');
}

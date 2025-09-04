import { K8s } from '../logic/mod.ts';
import { DIR_PATH, logger, Utils } from '../utils/mod.ts';

export async function ossCMD(namespace?: string) {
    logger.info(`Starting OSS data collection...`);
    const k8s = new K8s();
    const utils = new Utils();

    if (!namespace) {
        logger.info('No namespace provided, prompting user to select one.');
        const selected = await k8s.selectNamespace();
        namespace = selected;
    }

    console.log(`Gathering data in the '${namespace}' namespace for OSS Argo`);
    logger.info(`Gathering data in the '${namespace}' namespace for OSS Argo`);
    const k8sResources = k8s.getResources(namespace);
    await utils.processData(DIR_PATH, k8sResources);
    await utils.preparePackage(DIR_PATH, 'oss');
}

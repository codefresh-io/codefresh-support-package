import { Codefresh, K8s } from '../logic/mod.ts';
import { logger, Utils } from '../utils/mod.ts';

export async function onpremCMD(namespace?: string, dirPath?: string) {
    logger.info('Starting OnPrem data collection...');
    const cf = new Codefresh();
    const k8s = new K8s();
    const utils = new Utils();

    const cfCreds = cf.getCredentials();

    if (cfCreds && cfCreds.baseUrl === 'https://g.codefresh.io/api') {
        logger.warn(
            'Cannot gather On-Prem data for Codefresh SaaS. If you need to gather data for Codefresh On-Prem, please update your ./cfconfig context (or Envs) to point to an On-Prem instance.',
        );
        logger.warn('For Codefresh SaaS, use "pipelines" or "gitops" commands.');
        return;
    }

    if (!namespace) {
        const selected = await k8s.selectNamespace();
        namespace = selected;
    }

    if (cfCreds) {
        const dataFetchers = [
            { name: 'OnPrem_Accounts', fetcher: cf.getSystemAccounts },
            { name: 'OnPrem_Runtimes', fetcher: cf.getSystemRuntimes },
            { name: 'OnPrem_Feature_Flags', fetcher: cf.getSystemFeatureFlags },
            { name: 'OnPrem_Total_Users', fetcher: cf.getSystemTotalUsers },
        ];

        for (const { name, fetcher } of dataFetchers) {
            try {
                const data = await fetcher(cfCreds);
                await utils.writeYaml(data, name, dirPath ?? './cf-support');
            } catch (error) {
                logger.error(`Failed to fetch or write ${name}:\n${error}`);
            }
        }
    }

    logger.info(`Gathering data in the '${namespace}' namespace for Codefresh OnPrem`);
    const k8sResources = k8s.getResources(namespace);
    await utils.processData(dirPath ?? './cf-support', k8sResources);
    await utils.preparePackage(dirPath ?? './cf-support', 'onprem');
}

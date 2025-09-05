import { DIR_PATH, logger, Utils } from '../utils/mod.ts';
import { Codefresh, K8s } from '../logic/mod.ts';

export async function onpremCMD(namespace?: string) {
    logger.info('Starting OnPrem data collection...');
    const cf = new Codefresh();
    const k8s = new K8s();
    const utils = new Utils();

    const cfCreds = cf.getCredentials();

    if (cfCreds && cfCreds.baseUrl === 'https://g.codefresh.io/api') {
        console.error(
            'Cannot gather On-Prem data for Codefresh SaaS. If you need to gather data for Codefresh On-Prem, please update your ./cfconfig context (or Envs) to point to an On-Prem instance.',
        );
        logger.error(
            'Cannot gather On-Prem data for Codefresh SaaS. If you need to gather data for Codefresh On-Prem, please update your ./cfconfig context (or Envs) to point to an On-Prem instance.',
        );
        console.error('For Codefresh SaaS, use "pipelines" or "gitops" commands.');
        logger.error('For Codefresh SaaS, use "pipelines" or "gitops" commands.');
        return;
    }

    if (!namespace) {
        logger.info('No namespace provided, prompting user to select one.');
        const selected = await k8s.selectNamespace();
        namespace = selected;
    }

    if (cfCreds) {
        logger.info('Gathering OnPrem system data...');
        const dataFetchers = [
            { name: 'OnPrem_Accounts', fetcher: cf.getSystemAccounts },
            { name: 'OnPrem_Runtimes', fetcher: cf.getSystemRuntimes },
            { name: 'OnPrem_Feature_Flags', fetcher: cf.getSystemFeatureFlags },
            { name: 'OnPrem_Total_Users', fetcher: cf.getSystemTotalUsers },
        ];

        for (const { name, fetcher } of dataFetchers) {
            try {
                logger.info(`Fetching and writing ${name}...`);
                const data = await fetcher(cfCreds);
                await utils.writeYaml(data, name, DIR_PATH);
            } catch (error) {
                console.error(`Failed to fetch or write ${name}:\n${error}`);
                logger.error(`Failed to fetch or write ${name}:\n${error}`);
            }
        }
    }

    console.log(`Gathering data in the '${namespace}' namespace for Codefresh OnPrem`);
    logger.info(`Gathering data in the '${namespace}' namespace for Codefresh OnPrem`);
    const k8sResources = k8s.getResources(namespace);
    await utils.processData(DIR_PATH, k8sResources);
    await utils.preparePackage(DIR_PATH, 'onprem');
}

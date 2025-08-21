import { preparePackage, processData, writeYaml } from '../logic/utils.ts';
import { Codefresh, K8s } from '../logic/mod.ts';

export async function onpremCMD(namespace) {
    const cf = new Codefresh();
    const k8s = new K8s();
    const dirPath = `./cf-support-onprem-${new Date().toISOString().replace(/[:.]/g, '-').replace(/\.\d{3}Z$/, 'Z')}`;

    const cfCreds = cf.getCredentials();

    if (cfCreds && cfCreds.baseUrl === 'https://g.codefresh.io/api') {
        console.log(
            'Cannot gather On-Prem data for Codefresh SaaS. If you need to gather data for Codefresh On-Prem, please update your ./cfconfig context (or Envs) to point to an On-Prem instance.',
        );
        console.log('For Codefresh SaaS, use "pipelines" or "gitops" commands.');
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
                await writeYaml(data, name, dirPath);
            } catch (error) {
                console.error(`Failed to fetch or write ${name}:`, error.message);
            }
        }
    }

    console.log(`Gathering data in the '${namespace}' namespace for Codefresh OnPrem`);
    const k8sResources = k8s.getResources(namespace);
    await processData(dirPath, k8sResources);
    await preparePackage(dirPath);
}

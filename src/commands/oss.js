import { preparePackage, processData } from '../logic/utils.ts';
import { K8s } from '../logic/mod.ts';

export async function ossCMD(namespace) {
    const k8s = new K8s();
    const dirPath = `./cf-support-oss-${new Date().toISOString().replace(/[:.]/g, '-').replace(/\.\d{3}Z$/, 'Z')}`;

    if (!namespace) {
        const selected = await k8s.selectNamespace();
        namespace = selected;
    }

    console.log(`Gathering data in the '${namespace}' namespace for OSS Argo`);
    const k8sResources = k8s.getResources(namespace);
    await processData(dirPath, k8sResources);
    await preparePackage(dirPath);
}

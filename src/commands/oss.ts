import { K8s, Utils } from '../logic/mod.ts';

export async function ossCMD(namespace: string) {
    const k8s = new K8s();
    const utils = new Utils();
    const dirPath = `./cf-support-oss-${new Date().toISOString().replace(/[:.]/g, '-').replace(/\.\d{3}Z$/, 'Z')}`;

    if (!namespace) {
        const selected = await k8s.selectNamespace();
        namespace = selected;
    }

    console.log(`Gathering data in the '${namespace}' namespace for OSS Argo`);
    const k8sResources = k8s.getResources(namespace);
    await utils.processData(dirPath, k8sResources);
    await utils.preparePackage(dirPath);
}

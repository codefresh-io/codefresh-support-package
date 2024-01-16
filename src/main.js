'use strict';

import { Codefresh } from './codefresh.js';
import { autoDetectClient } from 'https://deno.land/x/kubernetes_client@v0.7.2/mod.ts';
import { AppsV1Api } from "https://deno.land/x/kubernetes_apis@v0.5.0/builtin/apps@v1/mod.ts";
import { BatchV1Api } from 'https://deno.land/x/kubernetes_apis@v0.5.0/builtin/batch@v1/mod.ts';
import { CoreV1Api } from 'https://deno.land/x/kubernetes_apis@v0.5.0/builtin/core@v1/mod.ts';
import { StorageV1Api } from 'https://deno.land/x/kubernetes_apis@v0.5.0/builtin/storage.k8s.io@v1/mod.ts';
import { ArgoprojIoV1alpha1Api } from 'https://deno.land/x/kubernetes_apis@v0.5.0/argo-cd/argoproj.io@v1alpha1/mod.ts';
import { compress } from 'https://deno.land/x/zip@v1.2.5/mod.ts';
import { stringify as toYaml } from 'https://deno.land/std@0.211.0/yaml/mod.ts';

console.log('Initializing \n');
const kubeConfig = await autoDetectClient();
const appsApi = new AppsV1Api(kubeConfig);
const coreApi = new CoreV1Api(kubeConfig);
const storageApi = new StorageV1Api(kubeConfig);
const batchApi = new BatchV1Api(kubeConfig);
const argoProj = new ArgoprojIoV1alpha1Api(kubeConfig);
const timestamp = new Date().getTime();
const dirPath = `./codefresh-support-${timestamp}`;

function selectRuntimeType() {
  const reTypes = ['classic', 'gitops', 'onprem'];
  reTypes.forEach((reType, index) => {
    console.log(`${index + 1}. ${reType}`);
  });
  const typeSelected = prompt('\nWhich Type Of Runtime Are We Using? (Number):');
  return reTypes[typeSelected - 1];
}

async function saveItems(resources, dir) {
  await Deno.mkdir(`${dirPath}/${dir}/`, { recursive: true });
  return Promise.all(resources.map((item) => {
    return Deno.writeTextFile(`${dirPath}/${dir}/${item.metadata.name}.yaml`, toYaml(item, { skipInvalid: true }));
  }));
}

async function gatherClassic() {
  const cf = new Codefresh();
  await cf.init();
  const reNames = await cf.getAllRuntimes();
  console.log('');
  reNames.forEach((re, index) => {
    console.log(`${index + 1}. ${re}`);
  });
  const selection = prompt('\nWhich Classic Runtime Are We Working With? (Number): ');
  const reSpec = cf.runtimes[selection - 1];
  const namespace = reSpec.runtimeScheduler.cluster.namespace;

  console.log(`\nGathering Data For ${reSpec.metadata.name}.`);

  const helmList = new Deno.Command('helm', { args: ['list', '-n', namespace, '-o', 'json'] });
  const output = await helmList.output();
  const helmReleases = JSON.parse(new TextDecoder().decode(output.stdout));

  const dataFetchers = {
    'Cron': () => batchApi.namespace(namespace).getCronJobList(),
    'Jobs': () => batchApi.namespace(namespace).getJobList(),
    'Nodes': () => coreApi.getNodeList(),
    'Volumes': () => coreApi.getPersistentVolumeList({ labelSelector: 'io.codefresh.accountName' }),
    'Volumeclaims': () => coreApi.namespace(namespace).getPersistentVolumeClaimList({ labelSelector: 'io.codefresh.accountName' }),
    'Configmaps': () => coreApi.namespace(namespace).getConfigMapList({ labelSelector: 'app.kubernetes.io/name=cf-runtime' }),
    'Services': () => coreApi.namespace(namespace).getServiceList(),
    'Pods': () => coreApi.namespace(namespace).getPodList(),
    'Events': () => coreApi.namespace(namespace).getEventList(),
    'Storageclass': () => storageApi.getStorageClassList(),
  };

  for (const [dir, fetcher] of Object.entries(dataFetchers)) {
    const resources = await fetcher();
    if (dir === 'Pods') {
      await saveItems(resources.items, dir);
      await Promise.all(resources.items.map(async (item) => {
        const log = await coreApi.namespace(namespace).getPodLog(item.metadata.name, { container: item.spec.containers[0].name });
        return Deno.writeTextFile(`${dirPath}/${dir}/${item.metadata.name}.log`, log);
      }));
    } else {
      await saveItems(resources.items, dir);
    }
  }

  Deno.writeTextFile(`${dirPath}/runtimeSpec.yaml`, toYaml(reSpec, { skipInvalid: true }));
  Deno.writeTextFile(`${dirPath}/classicReleases.yaml`, toYaml(helmReleases, { skipInvalid: true }));
}

async function gatherGitOps() {
  const namespaceList = await coreApi.getNamespaceList();
  console.log('');
  namespaceList.items.forEach((ns, index) => {
    console.log(`${index + 1}. ${ns.metadata.name}`);
  });
  const selection = prompt('\nWhich Namespace Is The GitOps Runtime Installed In? (Number): ');
  const namespace = namespaceList.items[selection - 1].metadata.name;

  const apps = await argoProj.namespace(namespace).getApplicationList();
  const isCodfresh = apps.items.some((app) => ['codefresh.io/entity'] in app.metadata.labels);

  if (!isCodfresh) {
    const continueData = confirm(`\nCould not find a GitOps Runtime in ${namespace}. Do you still want to continue?`);
    if (!continueData) {
      return;
    }
  }

  console.log(`\nGathering Data In ${namespace} For The GitOps Runtime.`);

  const helmList = new Deno.Command('helm', { args: ['list', '-n', namespace, '-o', 'json'] });
  const output = await helmList.output();
  const helmReleases = JSON.parse(new TextDecoder().decode(output.stdout));

  const dataFetchers = {
    'Apps': () => argoProj.namespace(namespace).getApplicationList(),
    'Nodes': () => coreApi.getNodeList(),
    'Configmaps': () => coreApi.namespace(namespace).getConfigMapList(),
    'Services': () => coreApi.namespace(namespace).getServiceList(),
    'Pods': () => coreApi.namespace(namespace).getPodList(),
    'Events': () => coreApi.namespace(namespace).getEventList(),
  };

  for (const [dir, fetcher] of Object.entries(dataFetchers)) {
    const resources = await fetcher();
    if (dir === 'Pods') {
      await saveItems(resources.items, dir);
      await Promise.all(resources.items.map(async (item) => {
        const log = await coreApi.namespace(namespace).getPodLog(item.metadata.name, { container: item.spec.containers[0].name });
        return Deno.writeTextFile(`${dirPath}/${dir}/${item.metadata.name}.log`, log);
      }));
    } else {
      await saveItems(resources.items, dir);
    }
  }

  Deno.writeTextFile(`${dirPath}/gitopsReleases.yaml`, toYaml(helmReleases, { skipInvalid: true }));
}

async function gatherOnPrem() {
  const cf = new Codefresh();
  await cf.init();
  const accounts = await cf.getOnPremAccounts();
  const runtimes = await cf.getOnPremRuntimes();

  const namespaceList = await coreApi.getNamespaceList();
  console.log('');
  namespaceList.items.forEach((ns, index) => {
    console.log(`${index + 1}. ${ns.metadata.name}`);
  });
  const selection = prompt('\nWhich Namespace Is Codefresh OnPrem Installed In? (Number): ');
  const namespace = namespaceList.items[selection - 1].metadata.name;

  console.log(`\nGathering Data For On Prem.`);

  const helmList = new Deno.Command('helm', { args: ['list', '-n', namespace, '-o', 'json'] });
  const output = await helmList.output();
  const helmReleases = JSON.parse(new TextDecoder().decode(output.stdout));

  const dataFetchers = {
    'Deployments': () => appsApi.namespace(namespace).getDeploymentList(),
    'Daemonsets': () => appsApi.namespace(namespace).getDaemonSetList(),
    'Nodes': () => coreApi.getNodeList(),
    'Volumes': () => coreApi.getPersistentVolumeList({ labelSelector: 'io.codefresh.accountName' }),
    'Volumeclaims': () => coreApi.namespace(namespace).getPersistentVolumeClaimList({ labelSelector: 'io.codefresh.accountName' }),
    'Services': () => coreApi.namespace(namespace).getServiceList(),
    'Pods': () => coreApi.namespace(namespace).getPodList(),
    'Events': () => coreApi.namespace(namespace).getEventList(),
    'Storageclass': () => storageApi.getStorageClassList(),
  };

  for (const [dir, fetcher] of Object.entries(dataFetchers)) {
    const resources = await fetcher();
    if (dir === 'Pods') {
      await saveItems(resources.items, dir);
      await Promise.all(resources.items.map(async (item) => {
        const log = await coreApi.namespace(namespace).getPodLog(item.metadata.name, { container: item.spec.containers[0].name });
        return Deno.writeTextFile(`${dirPath}/${dir}/${item.metadata.name}.log`, log);
      }));
    } else {
      await saveItems(resources.items, dir);
    }
  }

  Deno.writeTextFile(`${dirPath}/onPremReleases.yaml`, toYaml(helmReleases, { skipInvalid: true }));
  Deno.writeTextFile(`${dirPath}/onPremAccounts.yaml`, toYaml(accounts, { skipInvalid: true }));
  Deno.writeTextFile(`${dirPath}/onPremRuntimes.yaml`, toYaml(runtimes, { skipInvalid: true }));
}

async function main() {
  const runtimeType = selectRuntimeType();

  switch (runtimeType) {
    case 'classic':
      await gatherClassic();
      break;
    case 'gitops':
      await gatherGitOps();
      break;
    case 'onprem':
      await gatherOnPrem();
      break;
    default:
      console.log('Invalid runtime type selected');
      return;
  }

  console.log(`\nSaving data to ./codefresh-support-package-${timestamp}.zip`);
  await compress(dirPath, `./codefresh-support-package-${timestamp}.zip`, { overwrite: true });

  console.log('\nCleaning up temp directory');
  await Deno.remove(dirPath, { recursive: true });
  console.log(`\nPlease attach ./codefresh-support-package-${timestamp}.zip to your support ticket.`);
  console.log('Before attaching, verify the contents and remove any sensitive information.');
}

await main();

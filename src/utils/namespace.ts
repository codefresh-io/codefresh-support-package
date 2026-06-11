import { coreApi } from '../services/kubernetes/client.ts';

export async function selectNamespace(): Promise<string> {
    const namespaces = (await coreApi.getNamespaceList())
        .items
        .map((ns) => ns.metadata?.name)
        .filter(Boolean) as string[];

    namespaces.forEach((ns, i) => console.log(`${i + 1}. ${ns}`));

    let selection: number;
    do {
        selection = Number(prompt('\nWhich Namespace are we using? (Number): '));
    } while (isNaN(selection) || selection < 1 || selection > namespaces.length);

    return namespaces[selection - 1];
}

import { cfFetch } from './client.ts';
import { CodefreshCredentials } from './types.ts';

export async function getAccountRuntimes(creds: CodefreshCredentials) {
    const res = await cfFetch(creds, '/runtime-environments');
    return res.json();
}

export async function getAccountRuntimeSpec(creds: CodefreshCredentials, runtime: string) {
    const res = await cfFetch(creds, `/runtime-environments/${encodeURIComponent(runtime)}`);
    return res.json();
}

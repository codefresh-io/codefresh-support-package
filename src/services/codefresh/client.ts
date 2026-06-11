import { parse } from '@std/yaml';
import { CodefreshConfig, CodefreshCredentials } from './types.ts';

export async function getCredentials(): Promise<CodefreshCredentials | null> {
    const envToken = Deno.env.get('CF_API_KEY');
    const envUrl = Deno.env.get('CF_URL');

    if (envToken && envUrl) {
        const formattedUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
        const creds: CodefreshCredentials = {
            headers: { Authorization: envToken },
            baseUrl: `${formattedUrl}/api`,
        };
        return await validateCredentials(creds) ? creds : null;
    }

    const configPath = Deno.build.os === 'windows'
        ? `${Deno.env.get('USERPROFILE')}/.cfconfig`
        : `${Deno.env.get('HOME')}/.cfconfig`;

    const config = parse(Deno.readTextFileSync(configPath)) as CodefreshConfig;
    const currentContext = config.contexts[config['current-context']];

    if (!currentContext) return null;

    const creds: CodefreshCredentials = {
        headers: { Authorization: currentContext.token },
        baseUrl: `${currentContext.url}/api`,
    };
    return await validateCredentials(creds) ? creds : null;
}

async function validateCredentials(creds: CodefreshCredentials): Promise<boolean> {
    const res = await cfFetch(creds, '/runtime-environments');
    return res.ok;
}

// Single fetch wrapper — all other service files call this, never raw fetch
export function cfFetch(creds: CodefreshCredentials, path: string): Promise<Response> {
    return fetch(`${creds.baseUrl}${path}`, {
        method: 'GET',
        headers: { ...creds.headers },
    });
}

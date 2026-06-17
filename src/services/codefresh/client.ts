import { parse } from '@std/yaml';
import { logger } from '../../utils/logger.ts';
import { CodefreshConfig, CodefreshCredentials } from './types.ts';

export async function getCredentials(): Promise<CodefreshCredentials | null> {
    const envToken = Deno.env.get('CF_API_KEY');
    const envUrl = Deno.env.get('CF_URL');

    if (envToken && envUrl) {
        logger.info('Using Codefresh API credentials from environment variables');
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

    logger.info(`Using Codefresh API credentials from config file: ${configPath}`);
    const creds: CodefreshCredentials = {
        headers: { Authorization: currentContext.token },
        baseUrl: `${currentContext.url}/api`,
    };
    return await validateCredentials(creds) ? creds : null;
}

async function validateCredentials(creds: CodefreshCredentials): Promise<boolean> {
    logger.info('Validating Codefresh API credentials');
    const res = await cfFetch(creds, '/runtime-environments');

    if (!res.ok) {
        logger.error(`Invalid Codefresh API credentials: ${res.status} ${res.statusText}`);
        return false;
    }

    logger.info('Codefresh API credentials validated successfully');

    return true;
}

// Single fetch wrapper — all other service files call this, never raw fetch
export function cfFetch(creds: CodefreshCredentials, path: string): Promise<Response> {
    logger.info(`Making API request to Codefresh: ${path}`);
    return fetch(`${creds.baseUrl}${path}`, {
        method: 'GET',
        headers: { ...creds.headers },
    });
}

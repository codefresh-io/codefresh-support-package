import { parse } from '@std/yaml';
import { logger } from '../utils/mod.ts';
import { CodefreshConfig, CodefreshCredentials } from '../models/mod.ts';

export class Codefresh {
    constructor() {
        logger.info('Codefresh class instance created.');
    }

    getCredentials() {
        logger.info('Fetching Codefresh credentials...');
        const envToken = Deno.env.get('CF_API_KEY');
        const envUrl = Deno.env.get('CF_URL');
        let cf_creds: CodefreshCredentials | null = null;

        if (envToken && envUrl) {
            logger.info('Using Codefresh credentials from environment variables.');
            cf_creds = {
                headers: { Authorization: envToken },
                baseUrl: `${envUrl}/api`,
            };
            return cf_creds;
        }

        const configPath = Deno.build.os === 'windows'
            ? `${Deno.env.get('USERPROFILE')}/.cfconfig`
            : `${Deno.env.get('HOME')}/.cfconfig`;

        const configFileContent = Deno.readTextFileSync(configPath);
        const config = parse(configFileContent) as CodefreshConfig;
        const currentContext = config.contexts[config['current-context']];

        if (currentContext) {
            logger.info(`Using Codefresh context: ${currentContext.name}`);
            cf_creds = {
                headers: { Authorization: currentContext.token },
                baseUrl: `${currentContext.url}/api`,
            };
        }
        return cf_creds;
    }

    async getAccountRuntimes(cfCreds: CodefreshCredentials) {
        logger.info('Fetching account runtimes...');
        const response = await fetch(`${cfCreds.baseUrl}/runtime-environments`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const runtimes = await response.json();
        return runtimes;
    }

    async getAccountRuntimeSpec(cfCreds: CodefreshCredentials, runtime: string) {
        logger.info(`Fetching runtime spec for runtime: ${runtime}`);
        const response = await fetch(`${cfCreds.baseUrl}/runtime-environments/${encodeURIComponent(runtime)}`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const runtimeSpec = await response.json();
        return runtimeSpec;
    }

    async getSystemAccounts(cfCreds: CodefreshCredentials) {
        logger.info('Fetching system accounts...');
        const response = await fetch(`${cfCreds.baseUrl}/admin/accounts`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const accounts = await response.json();
        return accounts;
    }

    async getSystemRuntimes(cfCreds: CodefreshCredentials) {
        logger.info('Fetching system runtimes...');
        const response = await fetch(`${cfCreds.baseUrl}/admin/runtime-environments`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const onPremRuntimes = await response.json();
        return onPremRuntimes;
    }

    async getSystemTotalUsers(cfCreds: CodefreshCredentials) {
        logger.info('Fetching total system users...');
        const response = await fetch(`${cfCreds.baseUrl}/admin/user?limit=1&page=1`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const users = await response.json();
        return { totalUsers: users.total };
    }

    async getSystemFeatureFlags(cfCreds: CodefreshCredentials) {
        logger.info('Fetching system feature flags...');
        const response = await fetch(`${cfCreds.baseUrl}/admin/features`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const onPremSystemFF = await response.json();
        return onPremSystemFF;
    }
}

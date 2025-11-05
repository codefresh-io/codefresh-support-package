import { parse } from '@std/yaml';
import { logger } from '../utils/mod.ts';
import { CodefreshConfig, CodefreshCredentials } from '../models/mod.ts';

export class Codefresh {
    constructor() {
        logger.info('Codefresh class instance created.');
    }

    async getCredentials() {
        logger.info('Fetching Codefresh credentials...');
        const envToken = Deno.env.get('CF_API_KEY');
        const envUrl = Deno.env.get('CF_URL');
        let cf_creds: CodefreshCredentials | null = null;

        if (envToken && envUrl) {
            logger.info('Using Codefresh credentials from environment variables.');
            const formattedUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
            cf_creds = {
                headers: { Authorization: envToken },
                baseUrl: `${formattedUrl}/api`,
            };
            const isValid = await this.validateCredentials(cf_creds);
            if (!isValid) {
                return null;
            }
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
            const isValid = await this.validateCredentials(cf_creds);
            if (!isValid) {
                return null;
            }
        }

        return cf_creds;
    }

    async validateCredentials(cfCreds: CodefreshCredentials) {
        logger.info('Validating Codefresh credentials...');
        const response = await fetch(`${cfCreds.baseUrl}/runtime-environments`, {
            method: 'GET',
            headers: cfCreds.headers,
        });

        if (!response.ok) {
            logger.error(`Invalid Codefresh credentials. Status: ${JSON.stringify(await response.json())}`);
            return false;
        }
        logger.info('Codefresh credentials are valid.');
        return true;
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

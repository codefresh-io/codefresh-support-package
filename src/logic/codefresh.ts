import { parse } from '@std/yaml';

interface CodefreshContext {
    name: string;
    token: string;
    type: string;
    url: string;
}

interface CodefreshConfig {
    contexts: Record<string, CodefreshContext>;
    'current-context': string;
}

interface CodefreshCredentials {
    headers: { Authorization: string };
    baseUrl: string;
}

export class Codefresh {
    getCredentials() {
        const envToken = Deno.env.get('CF_API_KEY');
        const envUrl = Deno.env.get('CF_URL');
        let cf_creds: CodefreshCredentials | null = null;

        if (envToken && envUrl) {
            cf_creds = {
                headers: { Authorization: envToken },
                baseUrl: `${envUrl}/api`,
            };
        }

        const configPath = Deno.build.os === 'windows'
            ? `${Deno.env.get('USERPROFILE')}/.cfconfig`
            : `${Deno.env.get('HOME')}/.cfconfig`;

        const configFileContent = Deno.readTextFileSync(configPath);
        const config = parse(configFileContent) as CodefreshConfig;
        const currentContext = config.contexts[config['current-context']];

        if (currentContext) {
            cf_creds = {
                headers: { Authorization: currentContext.token },
                baseUrl: `${currentContext.url}/api`,
            };
        }
        return cf_creds;
    }

    async getAccountRuntimes(cfCreds: CodefreshCredentials) {
        const response = await fetch(`${cfCreds.baseUrl}/runtime-environments`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const runtimes = await response.json();
        return runtimes;
    }

    async getAccountRuntimeSpec(cfCreds: CodefreshCredentials, runtime: string) {
        const response = await fetch(`${cfCreds.baseUrl}/runtime-environments/${encodeURIComponent(runtime)}`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const runtimeSpec = await response.json();
        return runtimeSpec;
    }

    async getSystemlAccounts(cfCreds: CodefreshCredentials) {
        const response = await fetch(`${cfCreds.baseUrl}/admin/accounts`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const accounts = await response.json();
        return accounts;
    }

    async getASystemRuntimes(cfCreds: CodefreshCredentials) {
        const response = await fetch(`${cfCreds.baseUrl}/admin/runtime-environments`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const onPremRuntimes = await response.json();
        return onPremRuntimes;
    }

    async getSystemTotalUsers(cfCreds: CodefreshCredentials) {
        const response = await fetch(`${cfCreds.baseUrl}/admin/user?limit=1&page=1`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const users = await response.json();
        return { totalUsers: users.total };
    }

    async getSystemFeatureFlags(cfCreds: CodefreshCredentials) {
        const response = await fetch(`${cfCreds.baseUrl}/admin/features`, {
            method: 'GET',
            headers: cfCreds.headers,
        });
        const onPremSystemFF = await response.json();
        return onPremSystemFF;
    }
}

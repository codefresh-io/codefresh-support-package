import { cfFetch } from './client.ts';
import { CodefreshCredentials } from './types.ts';

export async function getSystemAccounts(creds: CodefreshCredentials) {
    const res = await cfFetch(creds, '/admin/accounts');
    return res.json();
}

export async function getSystemRuntimes(creds: CodefreshCredentials) {
    const res = await cfFetch(creds, '/admin/runtime-environments');
    return res.json();
}

export async function getSystemTotalUsers(creds: CodefreshCredentials) {
    const res = await cfFetch(creds, '/admin/user?limit=1&page=1');
    const users = await res.json();
    return { totalUsers: users.total };
}

export async function getSystemFeatureFlags(creds: CodefreshCredentials) {
    const res = await cfFetch(creds, '/admin/features');
    return res.json();
}

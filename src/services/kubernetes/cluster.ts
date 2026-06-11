import { kubeConfig } from './client.ts';

export async function getClusterVersion() {
    try {
        return await kubeConfig.performRequest({
            method: 'GET',
            path: '/version',
            expectJson: true,
        });
    } catch (error) {
        return { error: `Failed to fetch cluster version: ${error}` };
    }
}

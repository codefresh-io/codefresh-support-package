import { logger } from '../../utils/logger.ts';
import { kubeConfig } from './client.ts';

export async function getClusterVersion() {
    try {
        const version = await kubeConfig.performRequest({
            method: 'GET',
            path: '/version',
            expectJson: true,
        });
        logger.info(`Successfully fetched cluster version: ${JSON.stringify(version)}`);
        return version;
    } catch (error) {
        logger.error(`Failed to fetch cluster version: ${error instanceof Error ? error.message : String(error)}`);
        return { error: `Failed to fetch cluster version: ${error}` };
    }
}

import { Logger } from '@deno-library/logger';

const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace(/\.\d{3}Z$/, 'Z');

export const DIR_PATH = `cf-support-${timestamp}`;
Deno.mkdirSync(DIR_PATH, { recursive: true });

export const logger = new Logger();

logger.disableConsole();

await logger.initFileLogger(DIR_PATH, {
    filename: 'cf-support',
});

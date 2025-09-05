import { Logger } from 'jsr:@deno-library/logger';

export const DIR_PATH = `./cf-support-${new Date().toISOString().replace(/[:.]/g, '-').replace(/\.\d{3}Z$/, 'Z')}`;
Deno.mkdirSync(DIR_PATH, { recursive: true });

export const logger = new Logger();

logger.disableConsole();

await logger.initFileLogger(DIR_PATH, {
    filename: 'cf-support',
});

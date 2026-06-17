import { Command } from '@cliffy/command';
import { logger } from './utils/logger.ts';
import { gitopsCommand } from './commands/gitops.ts';
import { onpremCommand } from './commands/onprem.ts';
import { ossCommand } from './commands/oss.ts';
import { pipelinesCommand } from './commands/pipelines.ts';

export const APP_VERSION = '__APP_VERSION__';
logger.info(`Starting cf-support version ${APP_VERSION}`);

await new Command()
    .name('cf-support')
    .version(APP_VERSION)
    .description('Tool to gather information for Codefresh Support')
    .action(function (this: Command) {
        this.showHelp();
    })
    .command('gitops', gitopsCommand)
    .command('pipelines', pipelinesCommand)
    .command('onprem', onpremCommand)
    .command('oss', ossCommand)
    .parse(Deno.args);

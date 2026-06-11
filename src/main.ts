import { Command } from '@cliffy/command';
import { gitopsCommand } from './commands/gitops.ts';
import { onpremCommand } from './commands/onprem.ts';
import { ossCommand } from './commands/oss.ts';
import { pipelinesCommand } from './commands/pipelines.ts';

export const APP_VERSION = '__APP_VERSION__';

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

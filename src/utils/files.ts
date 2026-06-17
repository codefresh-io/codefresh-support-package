import { stringify as toYaml } from '@std/yaml';
import { logger } from './logger.ts';

export async function writeYaml(data: unknown, name: string, dirPath: string) {
    await Deno.mkdir(dirPath, { recursive: true });
    await Deno.writeTextFile(`${dirPath}/${name}.yaml`, toYaml(data, { skipInvalid: true }));
}

export async function preparePackage(dirPath: string, type: string) {
    const supportPackageZip = `${type}-${dirPath}.tar.gz`;
    console.log('Preparing the Support Package');
    logger.info('Preparing the Support Package');

    const command = new Deno.Command('tar', {
        args: ['-czf', supportPackageZip, dirPath],
    });
    const { code, stderr } = await command.output();

    if (code !== 0) {
        logger.error(`Failed to create tar.gz: ${supportPackageZip}\n${new TextDecoder().decode(stderr)}`);
        throw new Error(`Failed to create tar.gz: ${supportPackageZip}\n${new TextDecoder().decode(stderr)}`);
    }

    console.log('Cleaning up temp directory');
    logger.info('Cleaning up temp directory');
    await Deno.remove(dirPath, { recursive: true });
    console.log(`\nPlease attach ${supportPackageZip} to your support ticket.`);
    logger.info(`Support package created: ${supportPackageZip}`);
}

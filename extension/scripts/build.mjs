import { cp, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const target = process.argv[2];
if (!target || !['chrome', 'firefox'].includes(target)) {
  console.error('Usage: node scripts/build.mjs <chrome|firefox>');
  process.exit(1);
}

const distDir = resolve(rootDir, 'dist', target);

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await execFileAsync('tsc', ['-p', 'tsconfig.json', '--outDir', distDir], { cwd: rootDir });

await cp(resolve(rootDir, 'manifest', target, 'manifest.json'), resolve(distDir, 'manifest.json'));
await cp(resolve(rootDir, 'src', 'options.html'), resolve(distDir, 'options.html'));

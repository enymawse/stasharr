import { cp, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await execFileAsync('tsc', ['-p', 'tsconfig.json'], { cwd: rootDir });

await cp(resolve(rootDir, 'manifest', 'manifest.json'), resolve(distDir, 'manifest.json'));
await cp(resolve(rootDir, 'src', 'options.html'), resolve(distDir, 'options.html'));

import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const target = process.argv[2];
if (!target || !['chrome', 'firefox'].includes(target)) {
  console.error('Usage: node scripts/pack.mjs <chrome|firefox>');
  process.exit(1);
}

const distDir = resolve(rootDir, 'dist', target);
const flavor = target === 'firefox' ? 'addon' : 'extension';
const outFile = resolve(rootDir, 'dist', `stasharr-${flavor}-${target}.zip`);

await execFileAsync('zip', ['-r', outFile, '.'], { cwd: distDir });

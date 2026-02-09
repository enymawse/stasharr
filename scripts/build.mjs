import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';
import { build } from 'esbuild';
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

const srcDir = resolve(rootDir, 'src');
const commonIifeEntries = [
  resolve(srcDir, 'content', 'content.ts'),
  resolve(srcDir, 'content', 'pageParser.ts'),
  resolve(srcDir, 'shared', 'navigation.ts'),
];

const esmEntries = [resolve(srcDir, 'content', 'options.ts')];
if (target === 'chrome') {
  esmEntries.push(resolve(srcDir, 'background', 'background.ts'));
}

const iifeEntries = [...commonIifeEntries];
if (target === 'firefox') {
  iifeEntries.push(resolve(srcDir, 'background', 'background-firefox.ts'));
}

const buildGroup = async (entryPoints, format) => {
  if (entryPoints.length === 0) return;
  await build({
    entryPoints,
    bundle: true,
    format,
    platform: 'browser',
    target: 'es2022',
    outdir: distDir,
    outbase: srcDir,
    sourcemap: false,
    splitting: false,
    legalComments: 'none',
  });
};

await buildGroup(iifeEntries, 'iife');
await buildGroup(esmEntries, 'esm');

await cp(
  resolve(rootDir, 'manifest', target, 'manifest.json'),
  resolve(distDir, 'manifest.json'),
);
try {
  await cp(
    resolve(rootDir, 'docs', 'assets', 'brand'),
    resolve(distDir, 'icons'),
    {
      recursive: true,
      filter: (src) => {
        const ext = extname(src);
        return ext === '' || ext === '.png';
      },
    },
  );
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code;
    if (code === 'ENOENT') {
      // Icons are optional.
    } else {
      throw error;
    }
  } else {
    throw error;
  }
}
await cp(
  resolve(rootDir, 'src', 'content', 'options.html'),
  resolve(distDir, 'content', 'options.html'),
);

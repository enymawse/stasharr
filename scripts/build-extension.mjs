import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const extensionDir = path.join(rootDir, 'extension');
const outputDir = path.join(rootDir, 'dist', 'extension');

const targets = new Map([
  ['chrome', 'manifest.chrome.json'],
  ['firefox', 'manifest.firefox.json'],
]);

const args = new Set(process.argv.slice(2));
const requestedTargets = Array.from(targets.keys()).filter(
  (target) => !args.size || args.has(`--target=${target}`) || args.has(target),
);

if (requestedTargets.length === 0) {
  throw new Error(
    'No valid targets provided. Use --target=chrome or --target=firefox.',
  );
}

await fs.mkdir(outputDir, { recursive: true });

const copyBuild = async (target) => {
  const manifestName = targets.get(target);
  const targetDir = path.join(outputDir, target);

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(
    path.join(extensionDir, manifestName),
    path.join(targetDir, 'manifest.json'),
  );
  await fs.copyFile(
    path.join(extensionDir, 'content-script.js'),
    path.join(targetDir, 'content-script.js'),
  );
};

await Promise.all(requestedTargets.map((target) => copyBuild(target)));

const label =
  requestedTargets.length === 1
    ? requestedTargets[0]
    : requestedTargets.join(', ');
console.log(`Built extension targets: ${label}`);

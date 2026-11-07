// Rebuild the separate app and copy its static export into this website.
// Usage: node tools/sync-voice-laser-lab.mjs ../voice-laser-lab
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
if (!input) throw new Error('Provide the Voice Laser Lab source directory.');
const source = path.resolve(input);
const metadata = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
if (metadata.name !== 'voice-laser-lab' || !metadata.scripts?.['build:pages']) {
  throw new Error('This directory does not contain the Voice Laser Lab Pages build.');
}
const result = spawnSync('npm', ['run', 'build:pages'], {cwd: source, stdio: 'inherit'});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const output = path.join(source, 'dist-pages');
const html = await readFile(path.join(output, 'index.html'), 'utf8');
if (!html.includes('Voice / Laser Lab')) throw new Error('The export has no Voice Laser Lab entry page.');

const destination = fileURLToPath(new URL('../projects/voice-laser-lab/', import.meta.url));
await mkdir(destination, {recursive: true});
// Remove only stale Vite bundle names. Other files are copied from the export;
// the source project, build configuration, and user-created files stay intact.
const newAssets = new Set(await readdir(path.join(output, 'assets')));
let oldAssets = [];
try {oldAssets = await readdir(path.join(destination, 'assets'));} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await cp(output, destination, {recursive: true});
for (const name of oldAssets) {
  if (/^index-[\w-]+\.(?:js|css)$/.test(name) && !newAssets.has(name)) {
    await rm(path.join(destination, 'assets', name));
  }
}
console.log('Updated projects/voice-laser-lab/ from the static export.');

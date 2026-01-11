import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const zipPath = fileURLToPath(new URL('../function.zip', import.meta.url));

if (!existsSync(new URL('../dist', import.meta.url))) {
  throw new Error('dist/ missing; run `npm run build` first');
}
if (!existsSync(new URL('../node_modules', import.meta.url))) {
  throw new Error('node_modules/ missing; run `npm ci` first');
}

execFileSync('powershell', [
  '-NoProfile',
  '-Command',
  `Compress-Archive -Force -Path dist,node_modules,package.json -DestinationPath "${zipPath}"`,
], { stdio: 'inherit' });

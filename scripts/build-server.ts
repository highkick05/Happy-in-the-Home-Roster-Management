import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Record exact git commit hash into dist/version.json for server & client alignment
let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn('Could not retrieve git commit hash during server build');
}

const distDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
fs.writeFileSync(path.join(distDir, 'version.json'), JSON.stringify({ version: commitHash }), 'utf-8');

esbuild.build({
  entryPoints: [path.resolve(__dirname, '../src/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.resolve(__dirname, '../dist/server.cjs'),
  format: 'cjs',
  packages: 'external',
}).catch(() => process.exit(1));

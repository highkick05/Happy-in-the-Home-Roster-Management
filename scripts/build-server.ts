import * as esbuild from 'esbuild';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

esbuild.build({
  entryPoints: [path.resolve(__dirname, '../server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.resolve(__dirname, '../dist/server.cjs'),
  format: 'cjs',
  packages: 'external',
}).catch(() => process.exit(1));

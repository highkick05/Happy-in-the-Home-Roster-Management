import path from 'path';
import { fileURLToPath } from 'url';
let _filename;
let _dirname;
// @ts-ignore
_filename = fileURLToPath(import.meta.url);
_dirname = path.dirname(_filename);

const isBuilt = _dirname.endsWith('dist');
const rootDir = isBuilt ? path.join(_dirname, '..') : _dirname;
const dbFile = process.env.NODE_ENV === 'production' 
  ? path.join(rootDir, 'data', 'sqlite.db')
  : path.join(rootDir, 'sqlite.db');

console.log(dbFile);

const fs = require('fs');

const path = 'vite.config.ts';
let content = fs.readFileSync(path, 'utf-8');

const target = `workbox: {`;
const replacement = `workbox: {
          importScripts: ['/custom-sw.js'],`;

if (!content.includes('importScripts')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log('Added importScripts to vite.config.ts');
}

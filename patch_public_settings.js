import fs from 'fs';
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '"pwaIcon192",\\n          "pwaIcon512"',
  '"pwaIcon192",\n          "pwaIcon512",\n          "cancellationNoticePeriod"'
);
content = content.replace(
  '"pwaIcon192",\n          "pwaIcon512",\n        )',
  '"pwaIcon192",\n          "pwaIcon512",\n          "cancellationNoticePeriod"\n        )'
);
content = content.replace(
  'WHERE key IN (?, ?, ?, ?)',
  'WHERE key IN (?, ?, ?, ?, ?)'
);

fs.writeFileSync(file, content);

import fs from 'fs';
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "if (mainServiceId === 'custom') mainServiceId = null;",
  "if (mainServiceId === 'custom' || mainServiceId === 'orientation') mainServiceId = null;"
);
content = content.replace(
  "if (mainServiceId === 'custom' || mainServiceId === 'orientation') mainServiceId = null;",
  "if (mainServiceId === 'custom' || mainServiceId === 'orientation') mainServiceId = null;"
); // Already ran this above? Let's check

fs.writeFileSync(file, content);

const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

if (!content.includes('Pencil')) {
  content = content.replace(
    /Trash2, ListChecks/g,
    'Trash2, ListChecks, Pencil'
  );
  fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
}

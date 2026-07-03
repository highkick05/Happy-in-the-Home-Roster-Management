const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

code = code.replace(
  "Trash2, ListChecks}",
  "Trash2, ListChecks, ChevronDown, ChevronRight}"
);
if (!code.includes('ChevronDown')) {
  code = code.replace(
    "import {  CheckCircle2",
    "import { ChevronDown, ChevronRight, CheckCircle2"
  );
}

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);

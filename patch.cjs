const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');
content = content.replace(/  onToggleImportant,\r?\n  isExpanded,/, '  onToggleImportant,\n  onToggleReminder,\n  isExpanded,');
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);

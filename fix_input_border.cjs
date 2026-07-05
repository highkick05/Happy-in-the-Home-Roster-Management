const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  /<div className="flex items-center space-x-2 mt-1 pt-2 border-t border-border-subtle\/30">/g,
  '<div className={`flex items-center space-x-2 mt-1 ${totalSubtasks > 0 ? "pt-2 border-t border-border-subtle/30" : ""}`}>'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);

const fs = require('fs');

const filePath = 'src/components/Settings/SettingsView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/text-xs px-2 py-1 text-xs/g, 'px-2 py-1 flex items-center h-8 text-xs');
// And make sure table cells td are minimal
content = content.replace(/px-3 py-2/g, 'px-2 py-1.5');
content = content.replace(/<th className="px-3 py-2/g, '<th className="px-2 py-1.5');
// Make sure Home Care Sub-tab has tight padding
content = content.replace(/px-6 py-3.5/g, 'px-4 py-2');

fs.writeFileSync(filePath, content);

const fs = require('fs');
let content = fs.readFileSync('src/components/Directory/StaffClientsView.tsx', 'utf8');

// The button might still be there if the regex failed.
const buttonRegex = /\{\s*activeTab === 'STAFF' && \(\s*<button \s*onClick=\{\(\) => setIsPositionsModalOpen\(true\)\}[\s\S]*?Manage Positions\s*<\/button>\s*\)\s*\}/;
content = content.replace(buttonRegex, '');

// Remove component
const componentRegex = /<PositionsModal[\s\S]*?onClose=\{\(\) => setIsPositionsModalOpen\(false\)\}[\s\S]*?\/>/;
content = content.replace(componentRegex, '');

fs.writeFileSync('src/components/Directory/StaffClientsView.tsx', content);

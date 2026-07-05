const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const regex = /\{\/\* Progress Bar \(Inline if tasks exist and we are not showing them, or small indicator\) \*\/\}[\s\S]*?<div className="ml-1 text-\[#8B949E\]">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\)\}/;
content = content.replace(regex, '');

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);

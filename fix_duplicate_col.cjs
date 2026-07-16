const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

const regex = /                             <td className="px-4 py-2 border-r border-border-subtle\/30 whitespace-nowrap">\n                               <span className=\{`inline-flex px-1.5 py-0.5 rounded text-\[10px\] font-semibold tracking-wide uppercase border \$\{row\.funding_type === 'HOME_CARE' \? 'bg-purple-900\/10 border-purple-900\/20 text-purple-400' : 'bg-blue-900\/10 border-blue-900\/20 text-blue-400'\}`\}>\n                                 \{row\.funding_type === 'HOME_CARE' \? 'Home Care' : 'NDIS'\}\n                               <\/span>\n                             <\/td>\n/g;

let matchCount = 0;
content = content.replace(regex, (match) => {
    matchCount++;
    if (matchCount === 2) {
        return ''; // Remove the second one
    }
    return match;
});

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);

const fs = require('fs');
const file = 'src/components/Roster/RosterCalendar.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/resources=\{activeView === Views\.DAY \? resources : undefined\}/g, (match, offset) => {
    // Only replace the second occurrence or just replace all with simpler logic if needed?
    // Actually, I can just replace \`activeView === Views.DAY\` with \`(activeView as View) === Views.DAY\`
    return 'resources={(activeView as View) === Views.DAY ? resources : undefined}';
});
code = code.replace(/resourceIdAccessor=\{activeView === Views\.DAY \? \(r: any\) => r\?\.id : undefined\}/g, 
    'resourceIdAccessor={(activeView as View) === Views.DAY ? (r: any) => r?.id : undefined}');
code = code.replace(/resourceTitleAccessor=\{activeView === Views\.DAY \? \(r: any\) => r\?\.title : undefined\}/g, 
    'resourceTitleAccessor={(activeView as View) === Views.DAY ? (r: any) => r?.title : undefined}');

fs.writeFileSync(file, code);

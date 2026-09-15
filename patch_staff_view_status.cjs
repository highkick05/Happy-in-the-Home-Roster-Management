const fs = require('fs');
const file = 'src/components/Directory/StaffClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// The UI has `s.status === 'SUSPENDED'` but the `status` column does not exist on the users table. 
// We should remove the `s.status` checks or treat them as active.
content = content.replace(/ \${s\.status === 'SUSPENDED' \? 'opacity-60' : ''}/g, '');
content = content.replace(/ \${c\.status === 'SUSPENDED' \? 'opacity-60' : ''}/g, '');
content = content.replace(/ \${p\.status === 'SUSPENDED' \? 'opacity-60' : ''}/g, '');

// The fetch from `/api/staff` had `status` removed in earlier PRs or it was never there.
// Also fix the `/api/staff` query in src/server.ts!
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed UI status checks');

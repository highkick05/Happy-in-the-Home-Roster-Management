const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/RemittancesView.tsx', 'utf8');
code = code.replace("q.activity_name.toLowerCase().includes(s)", "(q.activity_name || '').toLowerCase().includes(s)");
fs.writeFileSync('src/components/Invoicing/RemittancesView.tsx', code);

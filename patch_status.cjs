const fs = require('fs');
const file = 'src/components/Directory/StaffClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const endpoint = activeTab === 'STAFF' \? `\/api\/staff\/\$\{id\}\/status` : activeTab === 'CLIENTS' \? `\/api\/clients\/\$\{id\}\/status` : `\/api\/providers\/\$\{id\}\/status`;/,
  "const endpoint = activeTab === 'STAFF' ? `/api/staff/${id}/status` : activeTab === 'CLIENTS' ? `/api/clients/${id}/status` : activeTab === 'CONTRACTORS' ? `/api/contractors/${id}/status` : `/api/providers/${id}/status`;"
);

fs.writeFileSync(file, content);

const fs = require('fs');
const file = 'src/components/Directory/StaffClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const endpoint = \(activeTab === "STAFF" \? "\/api\/staff" : activeTab === "CLIENTS" \? "\/api\/clients" : "\/api\/providers"\) \+ "\?t=" \+ Date\.now\(\);/,
  'const endpoint = (activeTab === "STAFF" ? "/api/staff" : activeTab === "CLIENTS" ? "/api/clients" : activeTab === "CONTRACTORS" ? "/api/contractors" : "/api/providers") + "?t=" + Date.now();'
);

content = content.replace(
  /if \(activeTab === 'STAFF'\) setStaff\(data\);\s+else if \(activeTab === 'CLIENTS'\) setClients\(data\);\s+else setProviders\(data\);/,
  "if (activeTab === 'STAFF') setStaff(data);\n        else if (activeTab === 'CLIENTS') setClients(data);\n        else if (activeTab === 'CONTRACTORS') setContractors(data);\n        else setProviders(data);"
);

fs.writeFileSync(file, content);

const fs = require('fs');
let content = fs.readFileSync('src/components/Directory/StaffClientsView.tsx', 'utf8');

content = content.replace(
  /Providers <span className="ml-2 px-1.5 py-0.5 rounded text-\[10px\] bg-brand-navy border border-border-subtle text-\[#8B949E\]">\{sortedProviders\.length\}<\/span>/,
  `{activeTab === 'CONTRACTORS' ? 'Services' : 'Providers'} <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-brand-navy border border-border-subtle text-[#8B949E]">{activeTab === 'CONTRACTORS' ? contractors.length : sortedProviders.length}</span>`
);

content = content.replace(
  /Add \{activeTab === 'STAFF' \? 'Staff' : activeTab === 'CLIENTS' \? 'Client' : 'Provider'\}/,
  `Add {activeTab === 'STAFF' ? 'Staff' : activeTab === 'CLIENTS' ? 'Client' : activeTab === 'CONTRACTORS' ? 'Service' : 'Provider'}`
);

fs.writeFileSync('src/components/Directory/StaffClientsView.tsx', content);

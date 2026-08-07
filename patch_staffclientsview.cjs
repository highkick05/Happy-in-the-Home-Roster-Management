const fs = require('fs');
let content = fs.readFileSync('src/components/Directory/StaffClientsView.tsx', 'utf8');

content = content.replace(
  /type\?: 'STAFF' \| 'CLIENTS' \| 'PROVIDERS'/g,
  "type?: 'STAFF' | 'CLIENTS' | 'PROVIDERS' | 'CONTRACTORS'"
);
content = content.replace(
  /<'STAFF' \| 'CLIENTS' \| 'PROVIDERS'>\(type\)/g,
  "<'STAFF' | 'CLIENTS' | 'PROVIDERS' | 'CONTRACTORS'>(type)"
);

content = content.replace(
  /const \[providers, setProviders\] = useState<any\[\]>\(\[\]\);/g,
  "const [providers, setProviders] = useState<any[]>([]);\n  const [contractors, setContractors] = useState<any[]>([]);"
);

content = content.replace(
  /const \[isProviderModalOpen, setIsProviderModalOpen\] = useState\(false\);\n  const \[selectedProvider, setSelectedProvider\] = useState<any>\(null\);/g,
  "const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);\n  const [selectedProvider, setSelectedProvider] = useState<any>(null);\n  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);\n  const [selectedContractor, setSelectedContractor] = useState<any>(null);"
);

// We need to fetch contractors
content = content.replace(
  /const res = await fetch\('\/api\/providers'/g,
  "if (activeTab === 'CONTRACTORS') {\n        const res = await fetch('/api/contractors', { headers: { Authorization: `Bearer ${token}` } });\n        if (res.ok) setContractors(await res.json());\n      }\n      const res = await fetch('/api/providers'"
);

fs.writeFileSync('src/components/Directory/StaffClientsView.tsx', content);

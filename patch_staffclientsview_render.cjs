const fs = require('fs');
let content = fs.readFileSync('src/components/Directory/StaffClientsView.tsx', 'utf8');

// Add "Clinical / Maintenance" tabs to CONTRACTORS view
content = content.replace(
  /<div className="flex gap-1 bg-black\/20 p-1 rounded-lg border border-white\/\[0\.05\]">/g,
  `$&
              {activeTab === 'CONTRACTORS' && (
                <>
                  <button onClick={() => setStaffTab('STAFF')} className={\`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 \${staffTab === 'STAFF' ? 'bg-brand-teal text-black shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/[0.04]'}\`}>Clinical</button>
                  <button onClick={() => setStaffTab('ADMIN')} className={\`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 \${staffTab === 'ADMIN' ? 'bg-brand-teal text-black shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/[0.04]'}\`}>Maintenance</button>
                </>
              )}`
);

// Add Button for CONTRACTORS
content = content.replace(
  /activeTab === 'PROVIDERS' \? \([\s\S]*?<\/button>\s*\)\s*:\s*\(/,
  `$& activeTab === 'CONTRACTORS' ? (
                <button onClick={() => { setSelectedContractor(null); setIsContractorModalOpen(true); }} className="px-4 py-2 bg-brand-teal text-black text-xs font-semibold rounded-lg hover:bg-teal-400 transition-colors flex items-center shadow-sm">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Contractor
                </button>
              ) : (`
);

// We need to add handleEditContractor
content = content.replace(
  /const handleEditProvider = \(provider: any\) => \{[\s\S]*?\};\n/,
  `$&  const handleEditContractor = (contractor: any) => {
    setSelectedContractor(contractor);
    setIsContractorModalOpen(true);
  };\n`
);

// Add table header logic
content = content.replace(
  /\{activeTab === 'PROVIDERS' \? 'Company Name' : 'Name'\}/g,
  "{activeTab === 'PROVIDERS' || activeTab === 'CONTRACTORS' ? 'Company Name' : 'Name'}"
);
content = content.replace(
  /\{activeTab === 'PROVIDERS' && <th className="px-4 py-2 font-semibold">Type<\/th>\}/g,
  "{activeTab === 'PROVIDERS' && <th className=\"px-4 py-2 font-semibold\">Type</th>}\n                {activeTab === 'CONTRACTORS' && <th className=\"px-4 py-2 font-semibold\">Type</th>}"
);

// Add Contractor Modal Component
content = content.replace(
  /import ProviderModal from '.\/ProviderModal';/,
  "import ProviderModal from './ProviderModal';\nimport ContractorModal from './ContractorModal';"
);
content = content.replace(
  /<ProviderModal[\s\S]*?\/>/,
  `$&
      <ContractorModal
        isOpen={isContractorModalOpen}
        onClose={() => setIsContractorModalOpen(false)}
        onSave={() => {
          setIsContractorModalOpen(false);
          fetchData();
        }}
        token={token!}
        contractor={selectedContractor}
      />`
);

fs.writeFileSync('src/components/Directory/StaffClientsView.tsx', content);

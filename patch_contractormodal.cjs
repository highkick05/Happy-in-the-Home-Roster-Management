const fs = require('fs');
let content = fs.readFileSync('src/components/Directory/ContractorModal.tsx', 'utf8');

// Replace Provider with Contractor
content = content.replace(/ProviderModal/g, 'ContractorModal');
content = content.replace(/ProviderProps/g, 'ContractorProps');
content = content.replace(/provider: any/g, 'contractor: any');
content = content.replace(/provider\?/g, 'contractor?');
content = content.replace(/provider\./g, 'contractor.');
content = content.replace(/provider_type/g, 'contractor_type');
content = content.replace(/management_fee/g, 'sort_order'); // just replace something we won't use
content = content.replace(/'provider'/g, "'contractor'");
content = content.replace(/\/api\/providers/g, '/api/contractors');
content = content.replace(/Add Provider/g, 'Add Contractor');
content = content.replace(/Edit Provider/g, 'Edit Contractor');
content = content.replace(/Provider Details/g, 'Contractor Details');

// Update state to use contractor_type
content = content.replace(
  /contractor_type: contractor\?.contractor_type \|\| 'NDIS'/g,
  "contractor_type: contractor?.contractor_type || 'Clinical'"
);
// Remove management_fee entirely
content = content.replace(/sort_order: contractor\?.sort_order \|\| 0,/g, "");
content = content.replace(/can_email_invoices: contractor\?.can_email_invoices \?\? 1,/g, "");

content = content.replace(/formData\.sort_order/g, '0');
content = content.replace(/formData\.can_email_invoices/g, '1');

// Change the provider_type select to contractor_type
content = content.replace(
  /<option value="NDIS">NDIS<\/option>[\s\S]*?<option value="Home Care">Home Care<\/option>[\s\S]*?<option value="Private">Private<\/option>/g,
  `<option value="Clinical">Clinical (Allied Health, etc)</option>
                <option value="Maintenance">Maintenance (Trades, etc)</option>`
);

content = content.replace(
  /\{formData\.contractor_type === 'Home Care' && \([\s\S]*?\}<\/div>[\s\S]*?\)\}/,
  ""
);

content = content.replace(
  /<div>\s*<label className="flex items-center space-x-2 text-sm text-\[#E6EDF3\]">[\s\S]*?<\/label>\s*<\/div>/,
  ""
);

fs.writeFileSync('src/components/Directory/ContractorModal.tsx', content);

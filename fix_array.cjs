const fs = require('fs');
let code = fs.readFileSync('src/components/Directory/ClientModal.tsx', 'utf8');

code = code.replace(/\[ client\.ndis_agreement_end_date \|\| '',/g, '// ndisAgreementEndDate: client.ndis_agreement_end_date || \'\',');
code = code.replace(/\[ '',/g, '// ndisAgreementEndDate: \'\',');

fs.writeFileSync('src/components/Directory/ClientModal.tsx', code);

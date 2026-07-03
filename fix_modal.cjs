const fs = require('fs');
let code = fs.readFileSync('src/components/Directory/ClientModal.tsx', 'utf8');
code = code.replace(/ndisAgreementStartDate:/g, '// ndisAgreementStartDate:')
           .replace(/ndisAgreementEndDate:/g, '// ndisAgreementEndDate:');
fs.writeFileSync('src/components/Directory/ClientModal.tsx', code);

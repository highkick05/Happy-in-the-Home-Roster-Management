const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/RemittancesView.tsx', 'utf8');
code = code.replace("setRemittances(await res.json());", `
      const data = await res.json();
      setRemittances(Array.isArray(data) ? data : []);
`);
fs.writeFileSync('src/components/Invoicing/RemittancesView.tsx', code);

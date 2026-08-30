const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/RemittancesView.tsx', 'utf8');

// The error was "g.filter is not a function". This means `remittances` is likely an object or undefined.
// We updated fetchRemittances to enforce it's an array: `setRemittances(Array.isArray(data) ? data : []);`
// But we should also make sure the initialization is correct.
code = code.replace("const [remittances, setRemittances] = useState<any[]>([]);", "const [remittances, setRemittances] = useState<any[]>([]);");

// And let's make sure the filteredRemittances doesn't crash if remittances is somehow undefined
code = code.replace("const filteredRemittances = remittances.filter(q => {", "const filteredRemittances = (remittances || []).filter(q => {");

fs.writeFileSync('src/components/Invoicing/RemittancesView.tsx', code);

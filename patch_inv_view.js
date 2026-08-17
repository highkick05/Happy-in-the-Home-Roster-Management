import fs from 'fs';
const file = 'src/components/Invoicing/InvoicingView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'placeholder={rate.toFixed(2)}',
  'placeholder={rate.toFixed(2)}\n                              disabled={row.serviceId === \'orientation\'}'
);

fs.writeFileSync(file, content);
console.log("Patched InvoicingView.tsx");

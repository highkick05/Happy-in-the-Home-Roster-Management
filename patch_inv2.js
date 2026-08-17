import fs from 'fs';
const file = 'src/components/Invoicing/InvoicingView.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('value="orientation"')) {
    content = content.replace(
      '<option value="custom">-- Custom (One-Off) Service Item --</option>',
      '<option value="orientation">-- Orientation --</option>\n                                    <option value="custom">-- Custom (One-Off) Service Item --</option>'
    );
}

if (!content.includes("serviceId === 'orientation'")) {
    content = content.replace(
      "if (serviceId && String(serviceId).startsWith('custom-')) {",
      "if (serviceId === 'orientation') { return { rate: 0, unit: 'Hour', name: 'Orientation' }; }\n    if (serviceId && String(serviceId).startsWith('custom-')) {"
    );
}

fs.writeFileSync(file, content);

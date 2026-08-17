import fs from 'fs';
const file = 'src/components/Invoicing/InvoicingView.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('<option value="orientation">-- Orientation --</option>')) {
    content = content.replace(
      '<option value="">Select Service</option>',
      '<option value="">Select Service</option>\n                          <option value="orientation">-- Orientation --</option>'
    );
}

fs.writeFileSync(file, content);

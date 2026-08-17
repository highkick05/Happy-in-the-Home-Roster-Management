import fs from 'fs';

const file = 'src/components/Invoicing/InvoicingView.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('value="orientation"')) {
      content = content.replace(
        '<option value="custom">-- Custom (One-Off) Service Item --</option>',
        '<option value="orientation">-- Orientation --</option>\n                                    <option value="custom">-- Custom (One-Off) Service Item --</option>'
      );
  }

  if (!content.includes("s.serviceId === 'orientation'")) {
      content = content.replace(
        "if (s.serviceId === 'custom') {",
        "if (s.serviceId === 'orientation') { return { rate: 0, unit: 'Hour', name: 'Orientation' }; }\n    if (s.serviceId === 'custom') {"
      );
  }

  content = content.replace(
      /disabled=\{s\.serviceId !== 'custom'\}/g,
      "disabled={s.serviceId !== 'custom'}" // wait, actually rate shouldn't be overridden if it's orientation. So we just need to ensure rate is 0.
  );
  
  fs.writeFileSync(file, content);
  console.log("Patched " + file);
}

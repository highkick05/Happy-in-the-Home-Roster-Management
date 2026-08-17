import fs from 'fs';
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const orientationLogic = `
      // Orientation check: if shift contains an orientation service, do not generate an invoice
      let isOrientation = false;
      try {
          const shiftData = db.prepare("SELECT services_json FROM shifts WHERE id = ?").get(shiftId) as any;
          if (shiftData && shiftData.services_json) {
              const parsed = JSON.parse(shiftData.services_json);
              if (Array.isArray(parsed) && parsed.some((p: any) => p.serviceId === 'orientation')) {
                  isOrientation = true;
              }
          }
      } catch (e) {}

      if (isOrientation) {
          console.log(\`[DEBUG] Skipping invoice generation because shift \${shiftId} contains Orientation service\`);
          db.prepare("DELETE FROM invoices WHERE shift_id = ? AND status != 'PAID'").run(shiftId);
          return;
      }

      if (data.lineItems.length === 0) return;
`;

content = content.replace(
  '      if (data.lineItems.length === 0) return;',
  orientationLogic
);

fs.writeFileSync(file, content);

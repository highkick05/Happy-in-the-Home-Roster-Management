import * as fs from 'fs';
import * as path from 'path';

function fixFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('=/>')) {
    content = content.replace(/=\/>/g, '=>');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${filePath}`);
  }
}

const files = [
  'src/components/Roster/AddRespiteBookingModal.tsx',
  'src/components/Invoicing/InvoicingView.tsx',
  'src/components/Invoicing/QuotesView.tsx',
  'src/components/Directory/ClientRosterTemplates.tsx',
  'src/components/Dashboard/StaffActivityReport.tsx',
  'src/components/Compliance/ComplianceDashboard.tsx',
  'src/components/Profile/ProfileView.tsx'
];

files.forEach(fixFile);

import fs from 'fs';

const filesToPatch = [
  'src/components/Roster/AddShiftModal.tsx',
  'src/components/Roster/AddHistoricalShiftModal.tsx',
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    content = content.replace(
      "serviceId: s.serviceId === 'custom' ? 'custom' : (s.serviceId ? parseInt(s.serviceId, 10) : null),",
      "serviceId: s.serviceId === 'custom' ? 'custom' : (s.serviceId === 'orientation' ? 'orientation' : (s.serviceId ? parseInt(s.serviceId, 10) : null)),\n                customName: s.serviceId === 'orientation' ? 'Orientation' : s.customName,"
    );

    fs.writeFileSync(file, content);
    console.log("Patched " + file);
  }
}

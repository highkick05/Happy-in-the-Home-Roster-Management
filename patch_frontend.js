import fs from 'fs';

const filesToPatch = [
  'src/components/Roster/AddShiftModal.tsx',
  'src/components/Roster/EditShiftModal.tsx',
  'src/components/Roster/AddHistoricalShiftModal.tsx',
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Add the orientation option to the <select>
    // In AddShiftModal, EditShiftModal, AddHistoricalShiftModal
    if (!content.includes('value="orientation"')) {
      content = content.replace(
        '<option value="custom">-- Custom Service --</option>',
        '<option value="orientation">-- Orientation --</option>\n                          <option value="custom">-- Custom Service --</option>'
      );
    }
    
    // 2. Add orientation to getServiceDetails
    if (!content.includes("s.serviceId === 'orientation'")) {
      content = content.replace(
        "if (s.serviceId === 'custom') {",
        "if (s.serviceId === 'orientation') { return { rate: 0, unit: 'Hour', name: 'Orientation' }; }\n    if (s.serviceId === 'custom') {"
      );
    }

    // 3. Make rate and unit fields disabled for orientation if they are rendered manually, but mostly we just need it disabled in the inputs.
    // Let's see if Rate is displayed.
    // The "Rate" is typically displayed or calculated. If we set rate to 0, it just says $0.00. 
    // In EditShiftModal / AddShiftModal, there's a rateOverride field. Let's make it disabled.
    content = content.replace(
        /disabled={s\.serviceId === 'custom' \? false : true}/g,
        "disabled={(s.serviceId === 'custom' || s.serviceId === 'orientation') ? false : true} /* We can leave it false for custom, but what about orientation? Let's just disable it if it's not custom */"
    );
    // Actually rate override should be disabled for orientation.
    content = content.replace(
        /disabled=\{!s\.isCustom && s\.serviceId !== 'custom'\}/g,
        "disabled={s.serviceId === 'orientation' || (!s.isCustom && s.serviceId !== 'custom')}"
    );

    fs.writeFileSync(file, content);
    console.log("Patched " + file);
  }
}

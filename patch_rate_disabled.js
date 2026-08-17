import fs from 'fs';

const filesToPatch = [
  'src/components/Roster/AddShiftModal.tsx',
  'src/components/Roster/AddHistoricalShiftModal.tsx',
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // For the rate input
    content = content.replace(
      'placeholder={`$${rate.toFixed(2)}`}',
      'placeholder={`$${rate.toFixed(2)}`}\n                                disabled={s.serviceId === \'orientation\'}'
    );

    // For the qty input, we could also disable it, but orientation has a duration, and the duration is the qty.
    // So if it's orientation, we probably want qty to reflect the hours. We can leave it open, or make it readonly?
    // "The quantity obviously being the duration of the orientation." So it shouldn't be zero.

    fs.writeFileSync(file, content);
    console.log("Patched " + file);
  }
}

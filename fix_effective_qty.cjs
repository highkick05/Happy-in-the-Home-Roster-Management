const fs = require('fs');
let content = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf8');

const targetStr = `                  const effectiveQty = isTravelOrTransport ? 0 : (s.qtyOverride !== undefined && s.qtyOverride !== '' ? Number(s.qtyOverride) : (unit === 'Hour' ? shiftHours : 1));`;

const replaceStr = `                  const effectiveQty = (isTravelOrTransport && !isHistorical) ? 0 : (s.qtyOverride !== undefined && s.qtyOverride !== '' ? Number(s.qtyOverride) : (unit === 'Hour' ? shiftHours : 1));`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', content);
  console.log('Successfully fixed effectiveQty in AddShiftModal.tsx');
} else {
  console.log('Could not find target string in AddShiftModal.tsx');
}

import fs from 'fs';
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace custom check with custom OR orientation
content = content.replace(
  'sd.isCustom ||\n          (sd.serviceId && String(sd.serviceId).startsWith("custom")) ||\n          sd.serviceId === null',
  'sd.isCustom ||\n          sd.serviceId === \'orientation\' ||\n          (sd.serviceId && String(sd.serviceId).startsWith("custom")) ||\n          sd.serviceId === null'
);

content = content.replace(
  'srv = {\n            id: sd.serviceId || \'custom\',\n            name: sd.customName || sd.name || "Custom Service",',
  'srv = {\n            id: sd.serviceId || \'custom\',\n            name: sd.serviceId === \'orientation\' ? \'Orientation\' : (sd.customName || sd.name || "Custom Service"),'
);

content = content.replace(
  'rate: Number(sd.rateOverride || sd.customRate || 0),\n            unit: sd.customUnit || "Hour",',
  'rate: sd.serviceId === \'orientation\' ? 0 : Number(sd.rateOverride || sd.customRate || 0),\n            unit: sd.serviceId === \'orientation\' ? "Hour" : (sd.customUnit || "Hour"),'
);

fs.writeFileSync(file, content);

import fs from 'fs';
const file = 'src/components/Settings/SettingsView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "onChange={e => setSettings({...settings, cancellationNoticePeriod: parseInt(e.target.value)})}",
  "onChange={e => setSettings({...settings, cancellationNoticePeriod: e.target.value})}"
);

fs.writeFileSync(file, content);

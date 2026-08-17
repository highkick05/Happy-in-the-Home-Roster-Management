import fs from 'fs';
const file = 'src/components/Settings/SettingsView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("cancellationNoticePeriod: '24',", "");
content = content.replace("    hcInvoicePrefix: 'HC-',", "    hcInvoicePrefix: 'HC-',\n    cancellationNoticePeriod: '24',");

const targetJSX = `<div className="mt-8 flex justify-end">`;
const newJSX = `
              <div className="pt-4 border-t border-border-subtle">
                <label className="block text-xs font-medium text-[#8B949E] mb-2">Cancellation Notice Period (Hours)</label>
                <input type="number" value={settings.cancellationNoticePeriod} onChange={e => setSettings({...settings, cancellationNoticePeriod: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" placeholder="24" />
                <p className="text-xs text-[#8B949E] mt-1">Default number of hours required for shift cancellation notice.</p>
              </div>

              <div className="mt-8 flex justify-end">`;

content = content.replace(targetJSX, newJSX);
fs.writeFileSync(file, content);

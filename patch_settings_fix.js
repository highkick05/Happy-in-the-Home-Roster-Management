import fs from 'fs';
const file = 'src/components/Settings/SettingsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetJSX = `<div className="pt-6">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'}`;

const newJSX = `<div className="col-span-2 border-t border-border-subtle pt-6 mt-6">
                 <h4 className="text-md font-medium text-[#E6EDF3] mb-4">Cancellation Policy</h4>
                 <div className="flex flex-col gap-2 p-4 border border-border-subtle bg-brand-navy rounded-xl shadow-sm">
                   <label className="text-sm font-medium text-slate-400">Cancellation Notice Period (Hours)</label>
                   <input
                      type="number"
                      name="cancellationNoticePeriod"
                     value={settings.cancellationNoticePeriod !== undefined ? settings.cancellationNoticePeriod : 24}
                     onChange={e => setSettings({...settings, cancellationNoticePeriod: parseInt(e.target.value)})}
                     className="w-full md:w-1/3 bg-slate-900 border border-slate-700 rounded p-2 text-white"
                     placeholder="e.g., 24"
                   />
                   <p className="text-xs text-slate-500">Default number of hours required for shift cancellation notice.</p>
                 </div>
              </div>
              <div className="pt-6">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'}`;

content = content.replace(targetJSX, newJSX);
fs.writeFileSync(file, content);

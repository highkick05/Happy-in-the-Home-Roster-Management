const fs = require('fs');
const file = 'src/components/AdminOnboarding/AdminOnboardingHub.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add to Step interface
content = content.replace(
  'is_mandatory: number;',
  'is_mandatory: number;\n  expiry_years: number;'
);

// 2. Default state for new step
content = content.replace(
  'requires_expiry: 0,',
  'requires_expiry: 0,\n          expiry_years: 1,'
);

// 3. Update the description for Upload Required
content = content.replace(
  '<span className="text-[11px] text-zinc-500 block">Require staff to upload a document for this step.</span>',
  '<span className="text-[11px] text-zinc-500 block">Require staff to upload a document. If unchecked, staff will instead check a box to confirm they have read and understood.</span>'
);

// 4. Add the select box for expiry duration
const trackExpiryRegex = /<div \s*onClick=\{\(\) => setEditForm\(\{\.\.\.editForm, requires_expiry: editForm\.requires_expiry \? 0 : 1\}\)\}\s*className="flex items-center gap-3 p-3 bg-black\/20 border border-white\/\[0\.05\] rounded-lg cursor-pointer group hover:bg-black\/40 transition-colors"\s*>[\s\S]*?Track Expiry via Cron Engine<\/span>[\s\S]*?<\/div>\s*<\/div>/;

const trackExpiryMatch = content.match(trackExpiryRegex);
if (trackExpiryMatch) {
  const replacement = trackExpiryMatch[0] + `
                              {editForm.requires_expiry === 1 && (
                                <div className="p-3 bg-black/20 border border-white/[0.05] rounded-lg mt-1">
                                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Expiry Duration</label>
                                  <select
                                    value={editForm.expiry_years || 1}
                                    onChange={e => setEditForm({...editForm, expiry_years: parseInt(e.target.value)})}
                                    className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-brand-teal transition-colors"
                                  >
                                    <option value={1}>1 Year</option>
                                    <option value={2}>2 Years</option>
                                    <option value={3}>3 Years</option>
                                    <option value={4}>4 Years</option>
                                    <option value={5}>5 Years</option>
                                  </select>
                                </div>
                              )}
`;
  content = content.replace(trackExpiryMatch[0], replacement);
}

fs.writeFileSync(file, content, 'utf8');
console.log('patched admin hub expiry');

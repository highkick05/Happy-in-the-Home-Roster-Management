const fs = require('fs');
let code = fs.readFileSync('src/components/Directory/StaffModal.tsx', 'utf8');

code = code.replace(
  'superMemberNumber: \'\',\n  });',
  'superMemberNumber: \'\',\n    canSwitchAdmin: false,\n  });'
);

code = code.replace(
  'superMemberNumber: staff.super_member_number || \'\',\n      });',
  'superMemberNumber: staff.super_member_number || \'\',\n        canSwitchAdmin: !!staff.can_switch_admin,\n      });'
);

const roleDropdownHtml = `<div className="md:col-span-2 gap-4 pb-2">
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Account Role *</label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>`;

const newRoleDropdownHtml = `<div className="md:col-span-2 gap-4 pb-2">
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Account Role *</label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {formData.role === 'STAFF' && (
                <div className="md:col-span-2 pt-1 pb-3 flex items-center">
                  <input
                    type="checkbox"
                    id="canSwitchAdmin"
                    name="canSwitchAdmin"
                    checked={formData.canSwitchAdmin}
                    onChange={(e) => setFormData(prev => ({ ...prev, canSwitchAdmin: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/[0.08] bg-black/40 text-brand-blue focus:ring-brand-blue"
                  />
                  <label htmlFor="canSwitchAdmin" className="ml-2 block text-[13px] text-zinc-300">
                    Allow switching to Admin portal
                  </label>
                </div>
              )}`;

code = code.replace(roleDropdownHtml, newRoleDropdownHtml);

fs.writeFileSync('src/components/Directory/StaffModal.tsx', code);

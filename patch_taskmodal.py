import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Add assigned_to_id to formData
form_data_pattern = re.compile(r'(const \[formData, setFormData\] = useState\(\{\n\s*title: task\?\.title \|\| \'\',\n\s*description: task\?\.description \|\| \'\',\n\s*status: task\?\.status \|\| \'To Do\',\n\s*due_date: task\?\.due_date \|\| \'\',\n\s*category_id: task\?\.category_id \|\| \(categories && categories\.length > 0 \? categories\[0\]\.id : \'\'\),\n\s*staff_ids: task\?\.staff\?\.map\(\(s: any\) => s\.id\) \|\| task\?\.assigned_staff_parsed \|\| \[\],\n\s*client_ids: task\?\.clients\?\.map\(\(c: any\) => c\.id\) \|\| task\?\.assigned_clients_parsed \|\| \[\],\n\s*sub_tasks: task\?\.sub_tasks \|\| \[\],\n\s*attachments: task\?\.attachments \? \(typeof task\?\.attachments === \'string\' \? JSON\.parse\(task\.attachments\) : task\.attachments\) : \[\])(\n\s*\}\);)', re.DOTALL)

def replace_form_data(match):
    return match.group(1) + ",\n    assigned_to_id: task?.assigned_to_id || ''" + match.group(2)

code = form_data_pattern.sub(replace_form_data, code)

# Add dropdown for assigned_to_id in the TaskModal
# Find the start of grid-cols-1 sm:grid-cols-2
grid_pattern = re.compile(r'(<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/\[0\.05\]">)', re.DOTALL)
new_grid = """<div className="pt-4 border-t border-white/[0.05]">
              <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">Primary Staff Assignment</label>
              <select
                value={formData.assigned_to_id || ''}
                onChange={e => setFormData({...formData, assigned_to_id: e.target.value ? parseInt(e.target.value) : ''})}
                className="w-full bg-black/20 border border-border-subtle rounded-none px-3 py-1.5 text-sm font-medium text-white focus:border-brand-teal outline-none mb-4"
              >
                <option value="">-- Select Staff --</option>
                {staffList?.map((staff: any) => (
                  <option key={staff.id} value={staff.id}>{staff.first_name} {staff.last_name}</option>
                ))}
              </select>
            </div>
            \\1"""

code = grid_pattern.sub(new_grid, code, count=1)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)

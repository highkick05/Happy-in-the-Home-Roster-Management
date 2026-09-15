const fs = require('fs');
let content = fs.readFileSync('src/components/Directory/StaffModal.tsx', 'utf8');

// 1. Add additionalPositions to form state
content = content.replace(
  'primaryPosition: staff?.primary_position || \'\',',
  'primaryPosition: staff?.primary_position || \'\',\n    additionalPositions: (staff?.additional_positions ? JSON.parse(staff.additional_positions) : []) as string[],'
);

content = content.replace(
  'primaryPosition: staff.primary_position || \'\',',
  'primaryPosition: staff.primary_position || \'\',\n        additionalPositions: (staff.additional_positions ? JSON.parse(staff.additional_positions) : []) as string[],'
);

content = content.replace(
  'primaryPosition: \'\',',
  'primaryPosition: \'\',\n        additionalPositions: [],'
);

// 2. Add state for positions
content = content.replace(
  'const [saving, setSaving] = useState(false);',
  'const [saving, setSaving] = useState(false);\n  const [positions, setPositions] = useState<{id: number, name: string}[]>([]);\n\n  useEffect(() => {\n    fetch(\'/api/positions\', { headers: { Authorization: `Bearer ${token}` } })\n      .then(res => res.json())\n      .then(data => Array.isArray(data) && setPositions(data))\n      .catch(console.error);\n  }, [token]);'
);

// 3. Update primaryPosition select options
content = content.replace(
  /<select name="primaryPosition".*?<\/select>/s,
  `<select name="primaryPosition" value={formData.primaryPosition} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                  <option value="">Select a position...</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>`
);

// 4. Add additionalPositions multiple select right below it
content = content.replace(
  '</select>\n              </div>',
  `</select>
              </div>
              <div className="md:col-span-2 pt-1 pb-3">
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Additional Positions</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {positions.filter(p => p.name !== formData.primaryPosition).map(p => (
                    <label key={p.id} className="flex items-center space-x-2 text-[12px] text-zinc-300">
                      <input 
                        type="checkbox" 
                        checked={formData.additionalPositions.includes(p.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, additionalPositions: [...prev.additionalPositions, p.name] }));
                          } else {
                            setFormData(prev => ({ ...prev, additionalPositions: prev.additionalPositions.filter(name => name !== p.name) }));
                          }
                        }}
                        className="rounded bg-black/40 border-white/[0.08] text-brand-blue focus:ring-brand-blue w-3.5 h-3.5"
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>`
);

fs.writeFileSync('src/components/Directory/StaffModal.tsx', content, 'utf8');
console.log("Patched StaffModal successfully");

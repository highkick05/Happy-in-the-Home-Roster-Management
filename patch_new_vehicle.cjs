const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const [newVehicle, setNewVehicle] = useState({ name: '', rego: '' });",
  "const [newVehicle, setNewVehicle] = useState({ name: '', rego: '', is_primary: true, user_id: '' });"
);

code = code.replace(
  "setNewVehicle({ name: '', rego: '' });",
  "setNewVehicle({ name: '', rego: '', is_primary: true, user_id: '' });"
);

const oldForm = `<div className="mb-6 bg-brand-bg/50 p-4 rounded-lg border border-border-subtle flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[#8B949E] mb-1">Make & Model</label>
                  <input 
                    type="text" value={newVehicle.name} onChange={e => setNewVehicle(prev => ({...prev, name: e.target.value}))}
                    className="w-full bg-brand-navy border border-border-subtle rounded px-3 py-2 text-sm text-[#E6EDF3]" placeholder="e.g. Toyota Camry"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[#8B949E] mb-1">Registration (Rego)</label>
                  <input 
                    type="text" value={newVehicle.rego} onChange={e => setNewVehicle(prev => ({...prev, rego: e.target.value}))}
                    className="w-full bg-brand-navy border border-border-subtle rounded px-3 py-2 text-sm text-[#E6EDF3]" placeholder="e.g. 1ABC123"
                  />
                </div>
                <button 
                  onClick={handleAddVehicle}
                  className="bg-brand-teal text-white px-4 py-2 rounded font-medium text-sm hover:bg-brand-teal/90 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Vehicle
                </button>
              </div>`;
              
const newForm = `<div className="mb-6 bg-brand-bg/50 p-4 rounded-lg border border-border-subtle flex flex-col gap-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1">Make & Model</label>
                    <input 
                      type="text" value={newVehicle.name} onChange={e => setNewVehicle(prev => ({...prev, name: e.target.value}))}
                      className="w-full bg-brand-navy border border-border-subtle rounded px-3 py-2 text-sm text-[#E6EDF3]" placeholder="e.g. Toyota Camry"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1">Registration (Rego)</label>
                    <input 
                      type="text" value={newVehicle.rego} onChange={e => setNewVehicle(prev => ({...prev, rego: e.target.value}))}
                      className="w-full bg-brand-navy border border-border-subtle rounded px-3 py-2 text-sm text-[#E6EDF3]" placeholder="e.g. 1ABC123"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    {user?.role === 'ADMIN' && (
                      <div>
                         <label className="block text-xs font-semibold text-[#8B949E] mb-1">Owner</label>
                         <select 
                           value={newVehicle.user_id} 
                           onChange={e => setNewVehicle(prev => ({...prev, user_id: e.target.value}))}
                           className="bg-brand-navy border border-border-subtle rounded px-3 py-1.5 text-sm text-[#E6EDF3] w-48"
                         >
                           <option value="">Select Staff...</option>
                           {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                         </select>
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm text-[#E6EDF3] cursor-pointer mt-4">
                      <input 
                        type="checkbox" 
                        checked={newVehicle.is_primary} 
                        onChange={e => setNewVehicle(prev => ({...prev, is_primary: e.target.checked}))}
                        className="rounded border-border-subtle bg-brand-navy text-brand-teal focus:ring-brand-teal"
                      />
                      Primary Vehicle
                    </label>
                  </div>
                  <button 
                    onClick={handleAddVehicle}
                    className="bg-brand-teal text-white px-4 py-2 rounded font-medium text-sm hover:bg-brand-teal/90 transition-colors flex items-center gap-2 mt-4"
                  >
                    <Plus className="w-4 h-4" /> Add Vehicle
                  </button>
                </div>
              </div>`;

if(code.includes('placeholder="e.g. 1ABC123"')) {
   code = code.replace(oldForm, newForm);
   console.log("Form replaced");
} else {
   console.log("Could not find form");
}
fs.writeFileSync(file, code);

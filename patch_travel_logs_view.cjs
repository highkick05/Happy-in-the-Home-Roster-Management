const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `import CustomDatePicker from './ui/CustomDatePicker';`;
const replacementStr = `import CustomDatePicker from './ui/CustomDatePicker';
import { Plus, Trash2 } from 'lucide-react';`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
}

const targetStr2 = `  const [previewPhoto, setPreviewPhoto] = useState<{url: string, type: string} | null>(null);`;
const replacementStr2 = `  const [previewPhoto, setPreviewPhoto] = useState<{url: string, type: string} | null>(null);
  const [showVehicles, setShowVehicles] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ name: '', rego: '' });`;

if (code.includes(targetStr2)) {
  code = code.replace(targetStr2, replacementStr2);
}

const targetStr3 = `  const handleSaveOdo = async (id: string) => {`;
const replacementStr3 = `  const handleAddVehicle = async () => {
    if (!newVehicle.name || !newVehicle.rego) return;
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle)
      });
      if (res.ok) {
        setNewVehicle({ name: '', rego: '' });
        fetchFilters();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    try {
      const res = await fetch(\`/api/vehicles/\${id}\`, { method: 'DELETE' });
      if (res.ok) fetchFilters();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveOdo = async (id: string) => {`;

if (code.includes(targetStr3)) {
  code = code.replace(targetStr3, replacementStr3);
}

const targetStr4 = `          <p className="text-sm text-[#8B949E] mt-1">
            View and manage travel information and odometer readings for shifts.
          </p>
        </div>
      </div>`;
const replacementStr4 = `          <p className="text-sm text-[#8B949E] mt-1">
            View and manage travel information and odometer readings for shifts.
          </p>
        </div>
        <button 
          onClick={() => setShowVehicles(true)}
          className="bg-brand-teal text-white px-4 py-2 rounded font-medium text-sm hover:bg-brand-teal/90 transition-colors"
        >
          Vehicle Register
        </button>
      </div>`;

if (code.includes(targetStr4)) {
  code = code.replace(targetStr4, replacementStr4);
}

const targetStr5 = `      {/* Photo Preview Modal */}`;
const replacementStr5 = `      {/* Vehicle Register Modal */}
      {showVehicles && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowVehicles(false)}>
          <div className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-brand-navy">
              <h3 className="text-lg font-semibold text-white">Vehicle Register</h3>
              <button onClick={() => setShowVehicles(false)} className="text-[#8B949E] hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <div className="mb-6 bg-brand-bg/50 p-4 rounded-lg border border-border-subtle flex gap-4 items-end">
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
              </div>
              
              <div className="border border-border-subtle rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-brand-navy border-b border-border-subtle text-xs uppercase text-[#8B949E]">
                    <tr>
                      <th className="px-4 py-2 border-r border-border-subtle/30">Vehicle</th>
                      <th className="px-4 py-2 border-r border-border-subtle/30">Rego</th>
                      {user?.role === 'ADMIN' && <th className="px-4 py-2 border-r border-border-subtle/30">Owner</th>}
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-brand-navy/30">
                    {vehicles.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-[#8B949E] text-sm">No vehicles registered yet.</td></tr>
                    ) : vehicles.map(v => (
                      <tr key={v.id}>
                        <td className="px-4 py-3 text-sm text-white font-medium border-r border-border-subtle/30">{v.name}</td>
                        <td className="px-4 py-3 text-sm text-[#E6EDF3] border-r border-border-subtle/30">{v.rego}</td>
                        {user?.role === 'ADMIN' && (
                          <td className="px-4 py-3 text-sm text-[#8B949E] border-r border-border-subtle/30">
                            {staff.find(s => s.id === v.user_id)?.first_name} {staff.find(s => s.id === v.user_id)?.last_name}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteVehicle(v.id.toString())} className="text-red-500 hover:text-red-400 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}`;

if (code.includes(targetStr5)) {
  code = code.replace(targetStr5, replacementStr5);
}

fs.writeFileSync(file, code);
console.log('Patched TravelLogsView');

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, CheckCircle2, Circle, Upload, FileText, Download } from 'lucide-react';

export default function VehiclesView() {
  const { user, token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  
  const [newVehicle, setNewVehicle] = useState({
    name: '', rego: '', user_id: '', ownership: 'COMPANY', 
    rego_expiry: '', rego_evidence_url: '', 
    insurance_type: 'THIRD_PARTY', insurance_provider: '', insurance_expiry: '', insurance_evidence_url: '',
    roadside_provider: '', roadside_expiry: '', roadside_evidence_url: '',
    year: '', has_roadside: false,
    is_primary: false
  });

  useEffect(() => {
    fetchVehicles();
    if (user?.role === 'ADMIN') {
      fetchStaff();
    }
  }, [user]);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles' + (user?.role === 'ADMIN' ? '/all' : ''), { headers });
      if (res.ok) setVehicles(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff', { headers });
      if (res.ok) setStaff(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveVehicle = async () => {
    if (!newVehicle.name || !newVehicle.rego) return;
    
    try {
      const url = selectedVehicle ? `/api/vehicles/${selectedVehicle.id}` : '/api/vehicles';
      const method = selectedVehicle ? 'PUT' : 'POST';
      
      const payload = { ...newVehicle };
      if (payload.ownership === 'COMPANY') {
        payload.user_id = '';
      }
      
      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setNewVehicle({ name: '', rego: '', user_id: '', ownership: 'COMPANY', rego_expiry: '', rego_evidence_url: '', insurance_type: 'THIRD_PARTY', insurance_provider: '', insurance_expiry: '', insurance_evidence_url: '', roadside_provider: '', roadside_expiry: '', roadside_evidence_url: '', year: '', has_roadside: false, is_primary: false });
        setSelectedVehicle(null);
        setShowAddModal(false);
        fetchVehicles();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    try {
      await fetch(`/api/vehicles/${id}`, { method: 'DELETE', headers });
      fetchVehicles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetPrimary = async (vehicle: any) => {
    try {
      await fetch(`/api/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vehicle, is_primary: 1 })
      });
      fetchVehicles();
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'rego_evidence_url' | 'insurance_evidence_url' | 'roadside_evidence_url') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setNewVehicle({ ...newVehicle, [field]: data.url });
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const openEditModal = (v: any) => {
    setSelectedVehicle(v);
    setNewVehicle({
      name: v.name, rego: v.rego, user_id: v.user_id || '', ownership: v.ownership || 'COMPANY',
      rego_expiry: v.rego_expiry || '', rego_evidence_url: v.rego_evidence_url || '',
      insurance_type: v.insurance_type || 'THIRD_PARTY', insurance_provider: v.insurance_provider || '', 
      insurance_expiry: v.insurance_expiry || '', insurance_evidence_url: v.insurance_evidence_url || '',
      roadside_provider: v.roadside_provider || '', roadside_expiry: v.roadside_expiry || '', roadside_evidence_url: v.roadside_evidence_url || '',
      year: v.year || '', has_roadside: !!v.has_roadside,
      is_primary: !!v.is_primary
    });
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setSelectedVehicle(null);
    setNewVehicle({ 
      name: '', 
      rego: '', 
      user_id: user?.role === 'ADMIN' ? '' : (user?.id ? String(user.id) : ''), 
      ownership: user?.role === 'ADMIN' ? 'COMPANY' : 'PRIVATE', 
      rego_expiry: '', 
      rego_evidence_url: '', 
      insurance_type: 'THIRD_PARTY', 
      insurance_provider: '', 
      insurance_expiry: '', 
      insurance_evidence_url: '', 
      roadside_provider: '', 
      roadside_expiry: '', 
      roadside_evidence_url: '', 
      year: '', 
      has_roadside: false, 
      is_primary: false 
    });
    setShowAddModal(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="w-full space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Vehicles</h1>
            <p className="text-[#8B949E] text-sm mt-1">Manage company and staff private vehicles</p>
          </div>
          <button 
            onClick={openAddModal}
            className="h-[38px] px-4 bg-brand-teal hover:bg-teal-600 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>

        <div className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-brand-navy border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E] font-semibold">
              <tr>
                <th className="px-3 py-3 border-r border-border-subtle/30">Make & Model</th>
                <th className="px-3 py-3 border-r border-border-subtle/30">Year</th>
                <th className="px-3 py-3 border-r border-border-subtle/30">Rego</th>
                <th className="px-3 py-3 border-r border-border-subtle/30">Ownership</th>
                <th className="px-3 py-3 border-r border-border-subtle/30 text-center">Default</th>
                <th className="px-3 py-3 border-r border-border-subtle/30">Rego Expiry</th>
                <th className="px-3 py-3 border-r border-border-subtle/30">Insurance</th>
                <th className="px-3 py-3 border-r border-border-subtle/30">Ins. Expiry</th>
                <th className="px-3 py-3 border-r border-border-subtle/30">Roadside</th>
                <th className="px-3 py-3 border-r border-border-subtle/30">R/S Expiry</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-[#E6EDF3]">
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-[#8B949E]">Loading vehicles...</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-[#8B949E]">No vehicles found.</td></tr>
              ) : (
                vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-brand-bg/50 transition-colors">
                    <td className="px-3 py-3 border-r border-border-subtle/30 font-medium text-white">{v.name}</td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">{v.year}</td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">{v.rego}</td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-bold tracking-wide uppercase border ${v.ownership === 'COMPANY' ? 'bg-blue-900/10 border-blue-900/20 text-blue-400' : 'bg-purple-900/10 border-purple-900/20 text-purple-400'}`}>
                        {v.ownership === 'COMPANY' ? 'Company' : 'Private'}
                      </span>
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30 text-center">
                       {v.ownership === 'PRIVATE' && v.user_id === user?.id && (
                          <button onClick={() => handleSetPrimary(v)} className="text-brand-teal hover:text-white transition-colors" title="Set as default vehicle">
                            {v.is_primary ? <CheckCircle2 className="w-5 h-5 mx-auto text-brand-teal" /> : <Circle className="w-5 h-5 mx-auto text-[#8B949E]" />}
                          </button>
                       )}
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                      {v.rego_expiry}
                      {v.rego_evidence_url && (
                        <a href={`/uploads/${v.rego_evidence_url}`} target="_blank" rel="noreferrer" className="block mt-1 text-xs text-brand-teal hover:underline flex items-center gap-1">
                          <FileText className="w-3 h-3" /> View Doc
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                      {v.insurance_type === 'COMPREHENSIVE' ? 'Comp.' : (v.insurance_type === 'THIRD_PARTY' ? '3rd Party' : '-')}
                      {v.insurance_provider && <div className="text-[10px] text-[#8B949E] uppercase tracking-wider">{v.insurance_provider}</div>}
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                      {v.insurance_expiry}
                      {v.insurance_evidence_url && (
                        <a href={`/uploads/${v.insurance_evidence_url}`} target="_blank" rel="noreferrer" className="block mt-1 text-xs text-brand-teal hover:underline flex items-center gap-1">
                          <FileText className="w-3 h-3" /> View Doc
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                      {v.has_roadside ? (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase border bg-green-900/10 border-green-900/20 text-green-400">Yes</span>
                      ) : (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase border bg-red-900/10 border-red-900/20 text-red-400">No</span>
                      )}
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                      {v.roadside_expiry}
                      {v.roadside_provider && <div className="text-[10px] text-[#8B949E] uppercase tracking-wider">{v.roadside_provider}</div>}
                      {v.roadside_evidence_url && (
                        <a href={`/uploads/${v.roadside_evidence_url}`} target="_blank" rel="noreferrer" className="block mt-1 text-xs text-brand-teal hover:underline flex items-center gap-1">
                          <FileText className="w-3 h-3" /> View Doc
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => openEditModal(v)} className="text-brand-teal hover:text-white px-2 py-1 text-xs transition-colors">Edit</button>
                      {user?.role === 'ADMIN' && (
                        <button onClick={() => handleDeleteVehicle(v.id.toString())} className="text-red-500 hover:text-red-400 px-2 py-1 text-xs transition-colors">Delete</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-brand-navy">
              <h3 className="text-lg font-semibold text-white">{selectedVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#8B949E] hover:text-white text-xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Vehicle Make & Model</label>
                    <input 
                      type="text" 
                      value={newVehicle.name}
                      onChange={e => setNewVehicle({...newVehicle, name: e.target.value})}
                      className="w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Year</label>
                    <input 
                      type="text" 
                      value={newVehicle.year}
                      onChange={e => setNewVehicle({...newVehicle, year: e.target.value})}
                      className="w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                    />
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Registration (Rego)</label>
                    <input 
                      type="text" 
                      value={newVehicle.rego}
                      onChange={e => setNewVehicle({...newVehicle, rego: e.target.value})}
                      className="w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Ownership</label>
                    <select
                      value={newVehicle.ownership}
                      onChange={e => setNewVehicle({...newVehicle, ownership: e.target.value})}
                      disabled={user?.role !== 'ADMIN'}
                      className={`w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none ${user?.role !== 'ADMIN' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {(user?.role === 'ADMIN' || newVehicle.ownership === 'COMPANY') && <option value="COMPANY">Company Vehicle</option>}
                      <option value="PRIVATE">Private (Staff Owned)</option>
                    </select>
                  </div>
                  
                  {newVehicle.ownership === 'PRIVATE' && user?.role === 'ADMIN' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Staff Owner</label>
                      <select
                        value={newVehicle.user_id}
                        onChange={e => setNewVehicle({...newVehicle, user_id: e.target.value})}
                        className="w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                      >
                        <option value="">Select Staff</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                      </select>
                    </div>
                  )}
               </div>
               
               <div className="border-t border-border-subtle pt-6">
                 <h4 className="text-sm font-semibold text-white mb-4">Registration Details</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Rego Expiry Date</label>
                      <input 
                        type="date" 
                        value={newVehicle.rego_expiry}
                        onChange={e => setNewVehicle({...newVehicle, rego_expiry: e.target.value})}
                        className="w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Rego Evidence</label>
                      <div className="flex items-center gap-3">
                         <label className="flex-1 h-[38px] px-3 bg-black/50 border border-border-subtle hover:border-brand-teal text-[#E6EDF3] rounded-md text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
                           <Upload className="w-4 h-4" />
                           {newVehicle.rego_evidence_url ? 'Change File' : 'Upload File'}
                           <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'rego_evidence_url')} />
                         </label>
                         {newVehicle.rego_evidence_url && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      </div>
                   </div>
                 </div>
               </div>

               <div className="border-t border-border-subtle pt-6">
                 <h4 className="text-sm font-semibold text-white mb-4">Insurance Details</h4>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                   <div>
                      <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Insurance Type</label>
                      <select
                        value={newVehicle.insurance_type}
                        onChange={e => setNewVehicle({...newVehicle, insurance_type: e.target.value})}
                        className="w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                      >
                        <option value="THIRD_PARTY">Third Party</option>
                        <option value="COMPREHENSIVE">Comprehensive</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Insurance Provider</label>
                      <input 
                        type="text" 
                        value={newVehicle.insurance_provider}
                        onChange={e => setNewVehicle({...newVehicle, insurance_provider: e.target.value})}
                        placeholder="e.g. RAC, AAMI"
                        className="w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                      />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Insurance Expiry Date</label>
                      <input 
                        type="date" 
                        value={newVehicle.insurance_expiry}
                        onChange={e => setNewVehicle({...newVehicle, insurance_expiry: e.target.value})}
                        className="w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Insurance Evidence</label>
                      <div className="flex items-center gap-3">
                         <label className="flex-1 h-[38px] px-3 bg-black/50 border border-border-subtle hover:border-brand-teal text-[#E6EDF3] rounded-md text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
                           <Upload className="w-4 h-4" />
                           {newVehicle.insurance_evidence_url ? 'Change File' : 'Upload File'}
                           <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'insurance_evidence_url')} />
                         </label>
                         {newVehicle.insurance_evidence_url && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      </div>
                   </div>
                 </div>
               </div>

               <div className="border-t border-border-subtle pt-6">
                 <h4 className="text-sm font-semibold text-white mb-4">Roadside Assistance Details</h4>
                 <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={newVehicle.has_roadside}
                        onChange={e => setNewVehicle({...newVehicle, has_roadside: e.target.checked})}
                        className="w-4 h-4 rounded border-border-subtle bg-black/50 text-brand-teal focus:ring-brand-teal focus:ring-offset-brand-navy"
                      />
                      <span className="text-sm font-medium text-[#E6EDF3] group-hover:text-white transition-colors">Has Roadside Assistance</span>
                    </label>
                 </div>
                 
                 {newVehicle.has_roadside && (
                   <>
                     <div className="grid grid-cols-2 gap-4 mb-4">
                       <div className="col-span-2">
                          <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Roadside Provider</label>
                          <input 
                            type="text" 
                            value={newVehicle.roadside_provider}
                            onChange={e => setNewVehicle({...newVehicle, roadside_provider: e.target.value})}
                            placeholder="e.g. RACV, NRMA"
                            className="w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                          />
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Roadside Expiry Date</label>
                          <input 
                            type="date" 
                            value={newVehicle.roadside_expiry}
                            onChange={e => setNewVehicle({...newVehicle, roadside_expiry: e.target.value})}
                            className="w-full bg-black/50 border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Roadside Evidence</label>
                          <div className="flex items-center gap-3">
                             <label className="flex-1 h-[38px] px-3 bg-black/50 border border-border-subtle hover:border-brand-teal text-[#E6EDF3] rounded-md text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
                               <Upload className="w-4 h-4" />
                               {newVehicle.roadside_evidence_url ? 'Change File' : 'Upload File'}
                               <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'roadside_evidence_url')} />
                             </label>
                             {newVehicle.roadside_evidence_url && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                          </div>
                       </div>
                     </div>
                   </>
                 )}
               </div>

            </div>
            
            <div className="p-6 border-t border-border-subtle bg-black/30 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-[#E6EDF3] hover:text-white hover:bg-white/5 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveVehicle}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-teal hover:bg-teal-600 rounded-md transition-colors"
              >
                Save Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

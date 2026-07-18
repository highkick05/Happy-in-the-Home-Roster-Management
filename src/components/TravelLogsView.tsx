import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Search, RefreshCw, Eye, Edit2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import CustomDatePicker from './ui/CustomDatePicker';
import { Plus, Trash2 } from 'lucide-react';

const extractAddress = (desc: string) => {
    if (!desc) return null;
    const matches = [...desc.matchAll(/\(([^)]+)\)/g)];
    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i][1];
        if (!m.includes('%') && !m.match(/^[-+]?\d*\.?\d+,\s*[-+]?\d*\.?\d+$/)) {
            return m;
        }
    }
    let cleaned = desc.replace(/\([^)]+\)/g, '').trim();
    return cleaned || desc.trim();
};


const OdometerPhotoIcon = ({ url, type, onClick }: { url: string, type: string, onClick: () => void }) => {
  return (
    <div className="relative group/icon flex items-center justify-center z-10 hover:z-50">
      <button onClick={onClick} className="text-brand-teal hover:text-white transition-colors p-1">
        <Eye className="w-3.5 h-3.5" />
      </button>
      
      <div className="absolute bottom-full mb-2 hidden group-hover/icon:block pointer-events-none drop-shadow-2xl right-0 transform translate-x-1/4">
        <div className="bg-brand-navy border border-border-subtle p-1.5 rounded-lg">
           <img src={url.startsWith('data:') || url.startsWith('blob:') ? url : `/uploads/${url}`} alt="Preview" className="max-h-48 max-w-48 object-contain rounded bg-black/50" />
        </div>
      </div>
    </div>
  );
};

export default function TravelLogsView() {
  const { user, token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedFundingType, setSelectedFundingType] = useState('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const [isEditingOdo, setIsEditingOdo] = useState<string | null>(null);
  const [editOdoStart, setEditOdoStart] = useState('');
  const [editOdoEnd, setEditOdoEnd] = useState('');
  const [editVehicleId, setEditVehicleId] = useState('');
  
  const [previewPhoto, setPreviewPhoto] = useState<{url: string, type: string} | null>(null);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showVehicles, setShowVehicles] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ name: '', rego: '', is_primary: true, user_id: '' });

  const fetchFilters = async () => {
    try {
      const [vRes, sRes, cRes] = await Promise.all([
        fetch('/api/vehicles', { headers }),
        user?.role === 'ADMIN' ? fetch('/api/staff', { headers }) : Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
        fetch('/api/clients', { headers })
      ]);
      if (vRes.ok) setVehicles(await vRes.json());
      if (sRes.ok && user?.role === 'ADMIN') setStaff(await sRes.json());
      if (cRes.ok) setClients(await cRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setPage(1);
    try {
      let url = new URL(window.location.origin + '/api/travel-logs');
      if (selectedStaff !== 'all') url.searchParams.set('staffId', selectedStaff);
      if (selectedClient !== 'all') url.searchParams.set('clientId', selectedClient);
      if (selectedVehicle !== 'all') url.searchParams.set('vehicleId', selectedVehicle);
      if (selectedFundingType !== 'all') url.searchParams.set('fundingType', selectedFundingType);
      if (startDate) url.searchParams.set('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) url.searchParams.set('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const res = await fetch(url.toString(), { headers });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedStaff, selectedClient, selectedVehicle, selectedFundingType, startDate, endDate]);

  const handleAddVehicle = async () => {
    if (!newVehicle.name || !newVehicle.rego) return;
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle)
      });
      if (res.ok) {
        setNewVehicle({ name: '', rego: '', is_primary: true, user_id: '' });
        fetchFilters();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE', headers });
      if (res.ok) fetchFilters();
    } catch (e) {
      console.error(e);
    }
  };

  const handleInlineSave = async (log: any, updates: any) => {
    try {
      const payload = {
        odometer_start_reading: updates.odometer_start_reading !== undefined ? (updates.odometer_start_reading || null) : log.odometer_start_reading,
        odometer_end_reading: updates.odometer_end_reading !== undefined ? (updates.odometer_end_reading || null) : log.odometer_end_reading,
        vehicle_id: updates.vehicle_id !== undefined ? (updates.vehicle_id || null) : log.vehicle_id
      };
      
      const res = await fetch(`/api/travel-logs/${log.id}/odometer`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveOdo = async (id: string) => {
    try {
      const res = await fetch(`/api/travel-logs/${id}/odometer`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odometer_start_reading: editOdoStart ? parseFloat(editOdoStart) : null,
          odometer_end_reading: editOdoEnd ? parseFloat(editOdoEnd) : null,
          vehicle_id: editVehicleId || null
        })
      });
      if (res.ok) {
        setIsEditingOdo(null);
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getLocalizedDateString = (dt: string) => {
    if (!dt) return '';
    try {
      return new Date(dt).toLocaleDateString('en-AU', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch {
      return dt;
    }
  };
  
  

    const formatRouteLog = (logStr: string | null, row?: any): string | null => {
    if (!logStr) return null;
    if (logStr === 'No route logged') return 'No route logged';
    if (!logStr.startsWith('{')) return logStr;
      
    const fallbackOrigin = row?.origin_address || 'Unknown';
    const fallbackDest = row?.destination_address || 'Unknown';

    const cleanLocationStr = (val: string, fallback: string) => {
        if (!val || val.trim().toLowerCase() === 'location' || val.trim().toLowerCase() === 'unknown' || val.trim() === '') {
            return fallback;
        }
        return val;
    };

    try {
      const parsed = JSON.parse(logStr);
      let out = [];
      
      if (parsed.homeCareTravel && parsed.homeCareTravel.legs) {
        const hcLegs = parsed.homeCareTravel.legs.map((l: any, idx: number) => {
           if (l.description && l.description.includes('Private Commute')) {
              return 'Private Commute';
           }
           let start = l.addressStart;
           let end = l.addressEnd;
                    
           if (!start || !end) {
              const parts = l.description ? l.description.split(' to ') : [];
              if (parts.length === 2) {
                 start = start || extractAddress(parts[0]);
                 end = end || extractAddress(parts[1]);
              }
           }
           return `${cleanLocationStr(start, idx === 0 ? fallbackOrigin : 'Unknown')} ➡️ ${cleanLocationStr(end, fallbackDest)}`;
        }).join(' | ');
        if (hcLegs) out.push(hcLegs);
      }
      
      if (parsed.providerTravel && parsed.providerTravel.legs) {
        const pLegs = parsed.providerTravel.legs.map((l: any, idx: number) => {
           if (l.distance === 0 && l.description && l.description.includes('Capped')) return 'MMM6 Capped';
           let start = l.addressStart;
           let end = l.addressEnd;
                    
           if (!start || !end) {
              const parts = l.description ? l.description.split(' to ') : [];
              if (parts.length === 2) {
                 start = start || extractAddress(parts[0]);
                 end = end || extractAddress(parts[1]);
              } else {
                 const arrowParts = l.description ? l.description.split(' → ') : [];
                 if (arrowParts.length === 2) {
                    start = start || extractAddress(arrowParts[0]);
                    end = end || extractAddress(arrowParts[1]);
                 }
              }
           }
           return `${cleanLocationStr(start, idx === 0 ? fallbackOrigin : 'Unknown')} ➡️ ${cleanLocationStr(end, fallbackDest)}`;
        }).join(' | ');
        if (pLegs) out.push(`PT: ${pLegs}`);
      }
      
      if (parsed.abt && parsed.abt.legs) {
        const aLegs = parsed.abt.legs.map((l: any, idx: number) => {
           let start = l.addressStart;
           let end = l.addressEnd;
                    
           if (!start || !end) {
              const arrowParts = l.description ? l.description.split(' → ') : [];
              if (arrowParts.length === 2) {
                 start = start || extractAddress(arrowParts[0]);
                 end = end || extractAddress(arrowParts[1]);
              } else {
                 const parts = l.description ? l.description.split(' to ') : [];
                 if (parts.length === 2) {
                    start = start || extractAddress(parts[0]);
                    end = end || extractAddress(parts[1]);
                 }
              }
           }
           return `${cleanLocationStr(start, idx === 0 ? fallbackOrigin : 'Unknown')} ➡️ ${cleanLocationStr(end, fallbackDest)}`;
        }).join(' | ');
        if (aLegs) out.push(`ABT: ${aLegs}`);
      }
          
      return out.join(' ; ') || logStr;
    } catch (e) {
      return logStr;
    }
  };

const expandedLogs = logs.map(log => {
    let parsed: any = {};
    if (log.transport_route_log && log.transport_route_log.startsWith('{')) {
      try { parsed = JSON.parse(log.transport_route_log); } catch(e){}
    }

    const isHC = log.funding_type === 'HOME_CARE' || log.funding_type === 'Home Care' || log.funding_type === 'HCP';
    
    let category = 'Other Travel';
    let hasPT = false;
    let hasABT = false;
    
    if (parsed.providerTravel && (parsed.providerTravel.distance > 0 || (parsed.providerTravel.legs && parsed.providerTravel.legs.length > 0))) {
        hasPT = true;
    }
    if (parsed.abt && (parsed.abt.distance > 0 || (parsed.abt.legs && parsed.abt.legs.length > 0))) {
        hasABT = true;
    }

    if (isHC) {
       category = 'Home Care Travel';
    } else if (hasPT && hasABT) {
       category = 'Provider Travel & Activity Based Transport';
    } else if (hasPT) {
       category = 'Provider Travel';
    } else if (hasABT) {
       category = 'Activity Based Transport';
    }
    
    return {
       ...log,
       _rowId: log.id.toString(),
       _category: category,
       _route: formatRouteLog(log.transport_route_log, log) || 'No route logged'
    };
  });

  
  const totalPTKm = expandedLogs.reduce((acc, log) => acc + (Number(log.provider_travel_km) || 0), 0);
  const totalPTCost = expandedLogs.reduce((acc, log) => acc + (Number(log.provider_travel_cost) || 0), 0);
  const totalABTKm = expandedLogs.reduce((acc, log) => acc + (Number(log.abt_km) || 0), 0);
  const totalABTCost = expandedLogs.reduce((acc, log) => acc + (Number(log.abt_cost) || 0), 0);
  const grandTotalKm = totalPTKm + totalABTKm;
  const grandTotalCost = totalPTCost + totalABTCost;

  return (
    <div className="flex flex-col h-full bg-brand-bg relative min-h-screen">
      <div className="flex items-center justify-between px-8 py-6 mb-2 border-b border-border-subtle bg-brand-navy">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-brand-teal" />
            Travel Logs
          </h1>
          <p className="text-sm text-[#8B949E] mt-1">
            View and manage travel information and odometer readings for shifts.
          </p>
        </div>
        <button 
          onClick={() => setShowVehicles(true)}
          className="bg-brand-teal text-white px-4 py-2 rounded font-medium text-sm hover:bg-brand-teal/90 transition-colors"
        >
          Vehicle Register
        </button>
      </div>
      
      <div className="p-8 pb-32 max-w-full overflow-x-auto space-y-6">
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {user?.role === 'ADMIN' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Staff</label>
              <select 
                value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all"
              >
                <option value="all">All Staff</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Client</label>
            <select 
              value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
              className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all"
            >
              <option value="all">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Vehicle</label>
            <select 
              value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}
              className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.rego})</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Funding Type</label>
            <select 
              value={selectedFundingType} onChange={e => setSelectedFundingType(e.target.value)}
              className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all"
            >
              <option value="all">All Funding</option>
              <option value="NDIS">NDIS</option>
              <option value="HOME_CARE">Home Care</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">Start Date</label>
            <CustomDatePicker selected={startDate} onChange={(date: Date) => setStartDate(date)} placeholderText="Start Date" className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3]"  position="bottom" />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">End Date</label>
            <CustomDatePicker selected={endDate} onChange={(date: Date) => setEndDate(date)} placeholderText="End Date" className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3]"  position="bottom" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-brand-navy/50 rounded-xl border border-border-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-brand-navy border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E] font-semibold">
                  {user?.role === 'ADMIN' && <th className="px-4 py-3 border-r border-border-subtle/30">Staff Name</th>}
                  <th className="px-4 py-3 border-r border-border-subtle/30">Service Date</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Care Type</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Client</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Category</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Travel Route</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Transport KM</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Start Odometer</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">End Odometer</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Vehicle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-sm text-[#E6EDF3]">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-[#8B949E]">
                       <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                       Loading travel logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-[#8B949E]">
                       No travel logs found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  expandedLogs.slice((page - 1) * pageSize, page * pageSize).map(log => {
                    const isEditing = isEditingOdo === log.id.toString();
                    return (
                      <tr key={log._rowId} className="hover:bg-brand-bg/50 transition-colors group">
                        {user?.role === 'ADMIN' && <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">{log.staff_first} {log.staff_last}</td>}
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">{getLocalizedDateString(log.start_time)}</td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${log.funding_type === 'HOME_CARE' || log.funding_type === 'Home Care' || log.funding_type === 'HCP' ? 'bg-purple-900/10 border-purple-900/20 text-purple-400' : 'bg-blue-900/10 border-blue-900/20 text-blue-400'}`}>
                            {log.funding_type === 'HOME_CARE' || log.funding_type === 'Home Care' || log.funding_type === 'HCP' ? 'Home Care' : 'NDIS'}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">{log.client_first} {log.client_last}</td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-brand-bg border-border-subtle text-[#E6EDF3]">
                            {log._category}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 max-w-sm truncate" title={log._route}>
                          {log._route}
                        </td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          <div className="flex flex-col text-[11px] leading-tight gap-0.5">
                            {Number(log.provider_travel_km) > 0 && (
                              <span className="text-[#8B949E]">
                                PT: {Number(log.provider_travel_km).toFixed(3)} km
                              </span>
                            )}
                            {Number(log.abt_km) > 0 && (
                              <span className="text-[#8B949E]">
                                ABT: {Number(log.abt_km).toFixed(3)} km
                              </span>
                            )}
                            {(Number(log.provider_travel_km) > 0 || Number(log.abt_km) > 0) ? (
                              <span className="text-[#E6EDF3] font-semibold mt-1 border-t border-border-subtle/50 pt-1">
                                Total: {((Number(log.provider_travel_km) || 0) + (Number(log.abt_km) || 0)).toFixed(3)} km
                              </span>
                            ) : (
                              <span className="text-[#8B949E] italic text-xs">0 km</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              defaultValue={log.odometer_start_reading !== null ? log.odometer_start_reading : ''} 
                              onBlur={(e) => {
                                 if (e.target.value !== (log.odometer_start_reading !== null ? log.odometer_start_reading.toString() : '')) {
                                    handleInlineSave(log, { odometer_start_reading: e.target.value });
                                 }
                              }}
                              className="w-24 bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-2 py-1 text-xs transition-colors"
                              placeholder="Start"
                            />
                            {log.odometer_start_photo && (
                              <OdometerPhotoIcon url={log.odometer_start_photo} type="Start" onClick={() => setPreviewPhoto({url: log.odometer_start_photo, type: 'Start'})} />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              defaultValue={log.odometer_end_reading !== null ? log.odometer_end_reading : ''} 
                              onBlur={(e) => {
                                 if (e.target.value !== (log.odometer_end_reading !== null ? log.odometer_end_reading.toString() : '')) {
                                    handleInlineSave(log, { odometer_end_reading: e.target.value });
                                 }
                              }}
                              className="w-24 bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-2 py-1 text-xs transition-colors"
                              placeholder="End"
                            />
                            {log.odometer_end_photo && (
                              <OdometerPhotoIcon url={log.odometer_end_photo} type="End" onClick={() => setPreviewPhoto({url: log.odometer_end_photo, type: 'End'})} />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select 
                            defaultValue={log.vehicle_id !== null ? log.vehicle_id : ''}
                            onChange={(e) => {
                               handleInlineSave(log, { vehicle_id: e.target.value });
                            }}
                            className="bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-2 py-1 text-xs transition-colors"
                          >
                            <option value="">No Vehicle</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    )
                  })
                )}
                            </tbody>
              <tfoot className="bg-brand-navy border-t-2 border-border-subtle font-semibold">
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 6 : 5} className="px-4 py-3 text-right text-[#E6EDF3] border-r border-border-subtle/30">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                    <div className="flex flex-col text-[11px] leading-tight gap-0.5">
                      {totalPTKm > 0 && (
                        <span className="text-[#8B949E]">
                          PT: {totalPTKm.toFixed(3)} km
                        </span>
                      )}
                      {totalABTKm > 0 && (
                        <span className="text-[#8B949E]">
                          ABT: {totalABTKm.toFixed(3)} km
                        </span>
                      )}
                      <span className="text-brand-teal font-bold mt-1 border-t border-border-subtle/50 pt-1">
                        Total: {grandTotalKm.toFixed(3)} km
                      </span>
                    </div>
                  </td>
                  <td colSpan={3} className="px-4 py-3 border-r border-border-subtle/30"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {expandedLogs.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-brand-navy">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#8B949E]">
                  Showing {Math.min((page - 1) * pageSize + 1, expandedLogs.length)} to {Math.min(page * pageSize, expandedLogs.length)} of {expandedLogs.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#8B949E]">Show</span>
                  <select 
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-black border border-border-subtle rounded px-2 py-1 text-sm text-[#E6EDF3] outline-none focus:border-brand-teal"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-brand-navy border border-border-subtle text-[#E6EDF3] rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(Math.ceil(expandedLogs.length / pageSize), p + 1))}
                  disabled={page === Math.ceil(expandedLogs.length / pageSize)}
                  className="px-3 py-1 bg-brand-navy border border-border-subtle text-[#E6EDF3] rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      {showVehicles && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowVehicles(false)}>
          <div className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-brand-navy">
              <h3 className="text-lg font-semibold text-white">Vehicle Register</h3>
              <button onClick={() => setShowVehicles(false)} className="text-[#8B949E] hover:text-white text-xl leading-none">&times;</button>
            </div>
            
            <div className="p-6">
              {user?.role === 'ADMIN' && (
                <div className="flex items-end gap-4 mb-6 p-4 border border-border-subtle rounded-lg bg-black/30">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Vehicle Make & Model</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Toyota Corolla"
                      value={newVehicle.name}
                      onChange={e => setNewVehicle({...newVehicle, name: e.target.value})}
                      className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Registration</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1ABC123"
                      value={newVehicle.rego}
                      onChange={e => setNewVehicle({...newVehicle, rego: e.target.value})}
                      className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Owner (Staff)</label>
                    <select
                      value={newVehicle.user_id}
                      onChange={e => setNewVehicle({...newVehicle, user_id: e.target.value})}
                      className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                    >
                      <option value="">Select Staff</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={handleAddVehicle}
                    className="h-[38px] px-4 bg-brand-teal hover:bg-teal-600 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add Vehicle
                  </button>
                </div>
              )}

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
                      <tr><td colSpan={user?.role === 'ADMIN' ? 4 : 3} className="px-4 py-8 text-center text-[#8B949E] text-sm">No vehicles registered yet.</td></tr>
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

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewPhoto(null)}>
          <div className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-brand-navy">
              <h3 className="text-lg font-semibold text-white">{previewPhoto.type} Odometer Photo</h3>
              <button onClick={() => setPreviewPhoto(null)} className="text-[#8B949E] hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 flex justify-center bg-black/30">
               {previewPhoto.url.startsWith('data:') || previewPhoto.url.startsWith('blob:') ? (
                 <img src={previewPhoto.url} alt="Odometer" className="max-w-full max-h-[70vh] rounded-lg shadow-xl" />
               ) : (
                 <img src={`/uploads/${previewPhoto.url}`} alt="Odometer" className="max-w-full max-h-[70vh] rounded-lg shadow-xl" />
               )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

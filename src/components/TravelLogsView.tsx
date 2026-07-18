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

export default function TravelLogsView() {
  const { user } = useAuth();
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
  const [newVehicle, setNewVehicle] = useState({ name: '', rego: '' });

  const fetchFilters = async () => {
    try {
      const [vRes, sRes, cRes] = await Promise.all([
        fetch('/api/vehicles'),
        user?.role === 'ADMIN' ? fetch('/api/staff') : Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
        fetch('/api/clients')
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
      
      const res = await fetch(url.toString());
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
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) fetchFilters();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveOdo = async (id: string) => {
    try {
      const res = await fetch(`/api/travel-logs/${id}/odometer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
           const start = l.startAddress ? extractAddress(l.startAddress) : null;
           const end = l.endAddress ? extractAddress(l.endAddress) : null;
           if (!start && !end) return `Leg ${idx+1} ${l.distanceText || ''}`;
           return `${cleanLocationStr(start || '', fallbackOrigin)} → ${cleanLocationStr(end || '', fallbackDest)}`;
        });
        if (hcLegs.length) out.push(hcLegs.join(', '));
      } else {
         if (parsed.providerTravel && parsed.providerTravel.distanceValue > 0) {
            const start = parsed.providerTravel.startAddress ? extractAddress(parsed.providerTravel.startAddress) : null;
            const end = parsed.providerTravel.endAddress ? extractAddress(parsed.providerTravel.endAddress) : null;
            out.push(`PT: ${cleanLocationStr(start || '', fallbackOrigin)} → ${cleanLocationStr(end || '', fallbackDest)}`);
         }
         if (parsed.activityBasedTransport && parsed.activityBasedTransport.distanceValue > 0) {
            const start = parsed.activityBasedTransport.startAddress ? extractAddress(parsed.activityBasedTransport.startAddress) : null;
            const end = parsed.activityBasedTransport.endAddress ? extractAddress(parsed.activityBasedTransport.endAddress) : null;
            out.push(`ABT: ${cleanLocationStr(start || '', fallbackDest)} → ${cleanLocationStr(end || '', fallbackDest)}`);
         }
      }
      return out.join(' | ') || 'No route details';
    } catch(e) {
       return logStr;
    }
  };

  const expandedLogs = [];
  logs.forEach(log => {
    let parsed: any = {};
    try {
      if (log.services_json && log.services_json.startsWith('{')) {
        parsed = JSON.parse(log.services_json);
      }
    } catch (e) {}

    const fallbackOrigin = log.origin_address || 'Unknown';
    const fallbackDest = log.destination_address || 'Unknown';
    const cleanLocationStr = (val: string, fallback: string) => {
        if (!val || val.trim().toLowerCase() === 'location' || val.trim().toLowerCase() === 'unknown' || val.trim() === '') {
            return fallback;
        }
        return val;
    };

    let hasTravel = false;

    if (parsed.homeCareTravel && parsed.homeCareTravel.legs && parsed.homeCareTravel.legs.length > 0) {
      hasTravel = true;
      const hcLegs = parsed.homeCareTravel.legs.map((l: any, idx: number) => {
         if (l.description && l.description.includes('Private Commute')) return 'Private Commute';
         const start = l.startAddress ? extractAddress(l.startAddress) : null;
         const end = l.endAddress ? extractAddress(l.endAddress) : null;
         if (!start && !end) return `Leg ${idx+1} ${l.distanceText || ''}`;
         return `${cleanLocationStr(start || '', fallbackOrigin)} → ${cleanLocationStr(end || '', fallbackDest)}`;
      });
      expandedLogs.push({
        ...log,
        _rowId: log.id + '_hc',
        _category: 'Home Care Travel',
        _route: hcLegs.join(', ')
      });
    } else {
      if (parsed.providerTravel && parsed.providerTravel.distanceValue > 0) {
        hasTravel = true;
        const start = parsed.providerTravel.startAddress ? extractAddress(parsed.providerTravel.startAddress) : null;
        const end = parsed.providerTravel.endAddress ? extractAddress(parsed.providerTravel.endAddress) : null;
        expandedLogs.push({
          ...log,
          _rowId: log.id + '_pt',
          _category: 'Provider Travel',
          _route: `${cleanLocationStr(start || '', fallbackOrigin)} → ${cleanLocationStr(end || '', fallbackDest)}`
        });
      }
      if (parsed.activityBasedTransport && parsed.activityBasedTransport.distanceValue > 0) {
        hasTravel = true;
        const start = parsed.activityBasedTransport.startAddress ? extractAddress(parsed.activityBasedTransport.startAddress) : null;
        const end = parsed.activityBasedTransport.endAddress ? extractAddress(parsed.activityBasedTransport.endAddress) : null;
        expandedLogs.push({
          ...log,
          _rowId: log.id + '_abt',
          _category: 'Activity Based Transport',
          _route: `${cleanLocationStr(start || '', fallbackDest)} → ${cleanLocationStr(end || '', fallbackDest)}`
        });
      }
    }

    if (!hasTravel) {
       // If no specific parsed travel data but maybe odometers exist, still show one row.
       expandedLogs.push({
          ...log,
          _rowId: log.id + '_none',
          _category: 'Other Travel',
          _route: log.services_json === 'No route logged' ? 'No route logged' : 'No route details'
       });
    }
  });

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
            <CustomDatePicker selected={startDate} onChange={(date: Date) => setStartDate(date)} placeholderText="Start Date" className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3]" />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">End Date</label>
            <CustomDatePicker selected={endDate} onChange={(date: Date) => setEndDate(date)} placeholderText="End Date" className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3]" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-brand-navy/50 rounded-xl border border-border-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-brand-navy border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E] font-semibold">
                  <th className="px-4 py-3 border-r border-border-subtle/30">Staff Name</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Service Date</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Care Type</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Client</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Category</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Travel Route</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Start Odometer</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">End Odometer</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-sm text-[#E6EDF3]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#8B949E]">
                       <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                       Loading travel logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#8B949E]">
                       No travel logs found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  expandedLogs.slice((page - 1) * pageSize, page * pageSize).map(log => {
                    const isEditing = isEditingOdo === log.id.toString();
                    return (
                      <tr key={log._rowId} className="hover:bg-brand-bg/50 transition-colors group">
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">{log.staff_first} {log.staff_last}</td>
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
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={editOdoStart} 
                              onChange={e => setEditOdoStart(e.target.value)}
                              className="w-24 bg-black border border-border-subtle rounded px-2 py-1 text-xs"
                              placeholder="Start"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              {log.odometer_start_reading !== null ? log.odometer_start_reading : '-'}
                              {log.odometer_start_photo && (
                                <button onClick={() => setPreviewPhoto({url: log.odometer_start_photo, type: 'Start'})} className="text-brand-teal hover:text-white transition-colors">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={editOdoEnd} 
                              onChange={e => setEditOdoEnd(e.target.value)}
                              className="w-24 bg-black border border-border-subtle rounded px-2 py-1 text-xs"
                              placeholder="End"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              {log.odometer_end_reading !== null ? log.odometer_end_reading : '-'}
                              {log.odometer_end_photo && (
                                <button onClick={() => setPreviewPhoto({url: log.odometer_end_photo, type: 'End'})} className="text-brand-teal hover:text-white transition-colors">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <select 
                                value={editVehicleId}
                                onChange={e => setEditVehicleId(e.target.value)}
                                className="bg-black border border-border-subtle rounded px-2 py-1 text-xs"
                              >
                                <option value="">No Vehicle</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                              <button onClick={() => handleSaveOdo(log.id.toString())} className="text-green-500 hover:text-green-400">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => setIsEditingOdo(null)} className="text-zinc-500 hover:text-zinc-400 text-xs">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs text-[#8B949E] mr-2">{log.vehicle_name ? `(${log.vehicle_name})` : ''}</span>
                              <button 
                                onClick={() => {
                                  setIsEditingOdo(log.id.toString());
                                  setEditOdoStart(log.odometer_start_reading !== null ? log.odometer_start_reading.toString() : '');
                                  setEditOdoEnd(log.odometer_end_reading !== null ? log.odometer_end_reading.toString() : '');
                                  setEditVehicleId(log.vehicle_id !== null ? log.vehicle_id.toString() : '');
                                }} 
                                className="text-[#8B949E] hover:text-white transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
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
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border border-border-subtle text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-bg transition-colors"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(Math.ceil(expandedLogs.length / pageSize), p + 1))}
                  disabled={page >= Math.ceil(expandedLogs.length / pageSize)}
                  className="px-3 py-1 rounded border border-border-subtle text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-bg transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Vehicle Register Modal */}
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
  );
}

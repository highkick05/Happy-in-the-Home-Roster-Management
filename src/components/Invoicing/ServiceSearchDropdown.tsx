import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Tag, ChevronDown, Star, Pencil } from 'lucide-react';

export const isHomeCareService = (s: any): boolean => {
  if (!s) return false;
  const t = String(s.type || '').toUpperCase();
  return t.includes('HOME') || t.includes('HCP') || t === 'CARE';
};

export const isNdisService = (s: any): boolean => {
  if (!s) return false;
  const t = String(s.type || '').toUpperCase();
  if (t === 'NDIS') return true;
  if (isHomeCareService(s)) return false;
  if (s.code && /^\d{2}_\d{3}/.test(String(s.code))) return true;
  return t !== 'HOME_CARE' && t !== 'HOME CARE' && t !== 'HCP';
};

export const getServiceFundingType = (s: any): 'NDIS' | 'HOME_CARE' => {
  return isHomeCareService(s) ? 'HOME_CARE' : 'NDIS';
};

interface ServiceSearchDropdownProps {
  services: any[];
  selectedServiceId: string;
  serviceName?: string;
  onSelect: (serviceId: string, service?: any) => void;
  onServiceNameChange?: (name: string) => void;
  fundingFilter: 'ALL' | 'NDIS' | 'HOME_CARE';
  onFilterChange?: (type: 'ALL' | 'NDIS' | 'HOME_CARE') => void;
  selectedClient?: any;
  date?: string;
  settings?: any;
}

export default function ServiceSearchDropdown({
  services = [],
  selectedServiceId,
  serviceName,
  onSelect,
  onServiceNameChange,
  fundingFilter,
  onFilterChange,
  selectedClient,
  date,
  settings
}: ServiceSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Find currently selected service
  const selectedService = useMemo(() => {
    if (!selectedServiceId) return null;
    return services.find((s: any) => String(s.id) === String(selectedServiceId)) || null;
  }, [services, selectedServiceId]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Deduplicate services to ensure ONLY the latest current NDIS Pricing schedule item per code is available in search
  const currentServices = useMemo(() => {
    const dedupedMap = new Map<string, any>();
    // Exclude archived services
    const activeList = (services || []).filter((s: any) => s && s.status !== 'ARCHIVED');

    for (const s of activeList) {
      if (isNdisService(s) && s.code) {
        const codeKey = `NDIS_${String(s.code).trim().toUpperCase()}`;
        const existing = dedupedMap.get(codeKey);
        if (!existing) {
          dedupedMap.set(codeKey, s);
        } else {
          // Prioritize ACTIVE status over others, then higher ID (latest imported pricing schedule)
          const existingActive = existing.status === 'ACTIVE';
          const currentActive = s.status === 'ACTIVE';
          if (currentActive && !existingActive) {
            dedupedMap.set(codeKey, s);
          } else if (currentActive === existingActive && (Number(s.id) || 0) > (Number(existing.id) || 0)) {
            dedupedMap.set(codeKey, s);
          }
        }
      } else if (s.code) {
        const key = `${s.type || 'HC'}_${String(s.code).trim().toUpperCase()}`;
        const existing = dedupedMap.get(key);
        if (!existing || (Number(s.id) || 0) > (Number(existing.id) || 0)) {
          dedupedMap.set(key, s);
        }
      } else {
        dedupedMap.set(`ID_${s.id}`, s);
      }
    }

    return Array.from(dedupedMap.values());
  }, [services]);

  // Filtered and sorted services list
  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    
    return currentServices.filter((s: any) => {
      // 1. Funding Type Filter
      if (fundingFilter === 'NDIS' && !isNdisService(s)) return false;
      if (fundingFilter === 'HOME_CARE' && !isHomeCareService(s)) return false;

      // 2. Search query matching NDIS code, service name, or description
      if (q) {
        const code = String(s.code || '').toLowerCase();
        const name = String(s.name || '').toLowerCase();
        const desc = String(s.description || '').toLowerCase();
        const type = String(s.type || '').toLowerCase();
        
        // Also allow matching code with underscores or dashes stripped (e.g. 01011 matches 01_011)
        const codeClean = code.replace(/[-_]/g, '');
        const qClean = q.replace(/[-_]/g, '');

        const matchesCode = code.includes(q) || (qClean.length > 2 && codeClean.includes(qClean));
        const matchesName = name.includes(q);
        const matchesDesc = desc.includes(q);
        const matchesType = type.includes(q);

        return matchesCode || matchesName || matchesDesc || matchesType;
      }

      return true;
    }).sort((a: any, b: any) => {
      // If client has assigned services, sort those to the top
      const aAssigned = selectedClient?.service_ids?.includes(a.id) ? 1 : 0;
      const bAssigned = selectedClient?.service_ids?.includes(b.id) ? 1 : 0;
      if (aAssigned !== bAssigned) return bAssigned - aAssigned;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [currentServices, fundingFilter, searchQuery, selectedClient]);

  // Resolves the display rate for a service option
  const resolveServiceRate = (s: any) => {
    if (!s) return { rate: 0, unit: '', isCustom: false };

    // Check client custom rate
    if (selectedClient && selectedClient.custom_rates && selectedClient.custom_rates[s.id] !== undefined) {
      return {
        rate: Number(selectedClient.custom_rates[s.id]),
        unit: s.unit || 'hr',
        isCustom: true
      };
    }

    let baseRate = Number(s.rate || 0);
    let dayOfWeek = -1;
    if (date) {
      dayOfWeek = new Date(date).getDay();
    }

    if (s.rates_json) {
      try {
        const rates = JSON.parse(s.rates_json || '{}');
        if (isHomeCareService(s)) {
          if (dayOfWeek === 0 && rates['Sunday']) baseRate = Number(rates['Sunday']);
          else if (dayOfWeek === 6 && rates['Saturday']) baseRate = Number(rates['Saturday']);
          else if (rates['Weekday']) baseRate = Number(rates['Weekday']);
          else if (rates['Hourly Rate']) baseRate = Number(rates['Hourly Rate']);
          else if (rates['Standard']) baseRate = Number(rates['Standard']);
        } else {
          const region = settings?.ndisRegion || 'NSW';
          if (rates[region] !== undefined) baseRate = Number(rates[region]);
          else if (rates['Standard']) baseRate = Number(rates['Standard']);
        }
      } catch (e) {}
    }

    return { rate: baseRate, unit: s.unit || 'hr', isCustom: false };
  };

  const handleSelectService = (serviceId: string) => {
    const s = services.find((x: any) => String(x.id) === String(serviceId));
    onSelect(serviceId, s);
    if (s && onServiceNameChange) {
      onServiceNameChange(s.name);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('');
    if (onServiceNameChange) {
      onServiceNameChange('');
    }
    setSearchQuery('');
  };

  // If a service is already selected and the search popover is closed:
  if (selectedService && !isOpen) {
    const isHC = isHomeCareService(selectedService);
    const { rate, unit, isCustom } = resolveServiceRate(selectedService);
    const isAssigned = selectedClient?.service_ids?.includes(selectedService.id);
    const displayName = (serviceName !== undefined && serviceName !== null && serviceName !== '')
      ? serviceName
      : selectedService.name;
    const isNameCustomized = Boolean(serviceName && serviceName.trim() !== selectedService.name.trim());

    return (
      <div 
        ref={containerRef} 
        className="w-full bg-[#0d0e12] border border-white/[0.12] hover:border-brand-teal/40 rounded-md p-2 text-white transition-all shadow-inner"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-0 flex items-center flex-wrap gap-1.5">
            {/* Editable Service Name Input */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-full group/edit">
              <input
                type="text"
                value={displayName}
                onChange={(e) => onServiceNameChange?.(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                title="Click to edit service name on quote"
                placeholder="Service name / description..."
                className="w-full bg-[#161820]/90 hover:bg-[#1a1d26] focus:bg-[#0c0d12] border border-white/[0.16] hover:border-brand-teal/60 focus:border-brand-teal text-xs font-medium text-white px-2.5 py-1 rounded outline-none transition-all focus:ring-1 focus:ring-brand-teal placeholder-zinc-500 shadow-sm"
              />
              <span className="text-zinc-500 group-hover/edit:text-brand-teal transition-colors shrink-0" title="Editable service name">
                <Pencil className="w-3 h-3" />
              </span>
              {isNameCustomized && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onServiceNameChange?.(selectedService.name);
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline shrink-0 cursor-pointer px-1 py-0.5"
                  title={`Reset to catalogue name: ${selectedService.name}`}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Funding badge */}
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border shrink-0 ${
              isHC
                ? 'bg-purple-900/20 text-purple-300 border-purple-500/30'
                : 'bg-sky-900/20 text-sky-300 border-sky-500/30'
            }`}>
              {isHC ? 'Home Care' : 'NDIS'}
            </span>

            {/* NDIS Code / Item Code */}
            {selectedService.code && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-teal-500/10 text-brand-teal border border-teal-500/25 px-1.5 py-0.5 rounded shrink-0">
                <Tag className="w-2.5 h-2.5" />
                {selectedService.code}
              </span>
            )}

            {/* Assigned badge */}
            {isAssigned && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
                <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                Assigned
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <span className="text-[11px] text-zinc-400">
              {isCustom ? (
                <span className="text-amber-400 font-medium">Custom: ${rate.toFixed(2)}/{unit}</span>
              ) : (
                <span>${rate.toFixed(2)}/{unit}</span>
              )}
            </span>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-[11px] text-brand-teal hover:text-white px-2 py-0.5 rounded bg-brand-teal/10 hover:bg-brand-teal/25 border border-brand-teal/30 transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3 h-3" />
              Change
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
              title="Clear service"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Search input & open dropdown view
  return (
    <div ref={containerRef} className="w-full relative">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-brand-teal absolute left-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search by NDIS Code (e.g. 01_011) or Home Care service..."
          className="w-full bg-[#09090b] border border-brand-teal/50 focus:border-brand-teal rounded-md py-1.5 pl-8 pr-16 text-white text-xs placeholder-zinc-500 focus:ring-1 focus:ring-brand-teal outline-none transition-all shadow-sm"
        />

        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-8 text-zinc-400 hover:text-white p-1 text-xs"
            title="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 text-zinc-400 hover:text-white p-1"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-brand-teal' : ''}`} />
        </button>
      </div>

      {/* Floating Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0c0d12] border border-white/[0.15] rounded-lg shadow-2xl overflow-hidden backdrop-blur-md flex flex-col max-h-72 animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Header Bar with Funding Switcher and Results Count */}
          <div className="px-3 py-2 bg-black/60 border-b border-white/[0.08] flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Funding:</span>
              <div className="inline-flex rounded-md p-0.5 bg-black/50 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => onFilterChange && onFilterChange('ALL')}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    fundingFilter === 'ALL'
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => onFilterChange && onFilterChange('NDIS')}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors flex items-center gap-1 ${
                    fundingFilter === 'NDIS'
                      ? 'bg-sky-600/30 text-sky-300 border border-sky-500/40'
                      : 'text-zinc-400 hover:text-sky-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  NDIS
                </button>
                <button
                  type="button"
                  onClick={() => onFilterChange && onFilterChange('HOME_CARE')}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors flex items-center gap-1 ${
                    fundingFilter === 'HOME_CARE'
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                      : 'text-zinc-400 hover:text-purple-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  Home Care
                </button>
              </div>
            </div>

            <div className="text-[10px] text-zinc-400 font-medium">
              {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'}
            </div>
          </div>

          {/* List of Services */}
          <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04] p-1">
            {filteredServices.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-zinc-400">
                  No services found matching <span className="text-white font-medium">"{searchQuery}"</span>
                  {fundingFilter !== 'ALL' && (
                    <span> under <span className="text-brand-teal">{fundingFilter === 'NDIS' ? 'NDIS' : 'Home Care'}</span></span>
                  )}.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {fundingFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => onFilterChange && onFilterChange('ALL')}
                      className="text-[11px] text-sky-400 hover:underline cursor-pointer"
                    >
                      Search All Funding Types
                    </button>
                  )}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredServices.map((s: any) => {
                const isHC = isHomeCareService(s);
                const isSelected = String(s.id) === String(selectedServiceId);
                const { rate, unit, isCustom } = resolveServiceRate(s);
                const isAssigned = selectedClient?.service_ids?.includes(s.id);

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectService(String(s.id))}
                    className={`p-2 rounded-md cursor-pointer transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-brand-teal/20 border border-brand-teal/40'
                        : 'hover:bg-white/[0.06] border border-transparent hover:border-white/10'
                    }`}
                  >
                    {/* Top Row: Name + Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-white group-hover:text-brand-teal leading-snug">
                          {s.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Funding Type Badge */}
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wide uppercase border ${
                          isHC
                            ? 'bg-purple-900/25 text-purple-300 border-purple-500/30'
                            : 'bg-sky-900/25 text-sky-300 border-sky-500/30'
                        }`}>
                          {isHC ? 'Home Care' : 'NDIS'}
                        </span>

                        {isAssigned && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded">
                            <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                            Assigned
                          </span>
                        )}

                        {isSelected && (
                          <span className="text-brand-teal flex items-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: NDIS Code + Rate Details */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 gap-2">
                      <div className="flex items-center gap-2">
                        {s.code ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-teal-300 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.2 rounded">
                            <Tag className="w-2.5 h-2.5 text-teal-400" />
                            {s.code}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-600">No Code</span>
                        )}

                        {s.service_category && (
                          <span className="text-[10px] text-zinc-500">
                            • {s.service_category}
                          </span>
                        )}
                      </div>

                      <div className="font-medium shrink-0">
                        {isCustom ? (
                          <span className="text-amber-400 font-medium">Custom: ${rate.toFixed(2)}/{unit}</span>
                        ) : (
                          <span className="text-zinc-300">${rate.toFixed(2)}/{unit}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-black/40 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-500">
            <span>Tip: Type an NDIS code (e.g. 01_011) or service title to filter instantly.</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

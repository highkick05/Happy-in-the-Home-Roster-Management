const fs = require('fs');
let content = fs.readFileSync('src/components/Directory/StaffClientsView.tsx', 'utf8');

const contractorRowCode = `
              {activeTab === 'CONTRACTORS' && contractors.filter(c => staffTab === 'STAFF' ? c.contractor_type === 'Clinical' : c.contractor_type === 'Maintenance').map(c => {
                const initials = (c.company_name || '').slice(0, 2).toUpperCase();
                return (
                  <tr key={c.id} onClick={() => handleEditContractor(c)} className={\`hover:bg-brand-bg/50 transition-colors cursor-pointer\`}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {initials || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-[#E6EDF3] flex items-center">
                            {c.company_name}
                          </div>
                          <div className="text-[#8B949E] text-xs mt-0.5">Joined {new Date(c.created_at || Date.now()).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 items-center">
                        <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider bg-[#1d1f23] text-brand-teal border border-brand-teal/20">
                          {c.contractor_type || 'Clinical'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-[#E6EDF3]">{c.contact_name || 'No Contact Name'}</div>
                      <div className="text-[#8B949E] text-xs mt-0.5">{c.email} {c.phone && \`• \${c.phone}\`}</div>
                    </td>
                    <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEditContractor(c)} className="p-1.5 text-[#8B949E] hover:text-brand-teal transition-colors rounded-md hover:bg-white/[0.04]">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
`;

content = content.replace(
  /\{activeTab === 'PROVIDERS' && sortedProviders\.map\(p => \{/,
  contractorRowCode + "\n              {activeTab === 'PROVIDERS' && sortedProviders.map(p => {"
);

content = content.replace(
  /\{\(activeTab === 'PROVIDERS' && providers\.length === 0\) && \(/,
  `{(activeTab === 'CONTRACTORS' && contractors.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-[#8B949E]">No contractors found.</td></tr>
              )}
              {(activeTab === 'PROVIDERS' && providers.length === 0) && (`
);

fs.writeFileSync('src/components/Directory/StaffClientsView.tsx', content);

const fs = require('fs');
const file = 'src/components/Directory/StaffClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const contractorSuspend = `
                      <button 
                        onClick={() => handleToggleStatus(c.id, c.status || 'ACTIVE')} 
                        className="p-1.5 text-[#8B949E] hover:text-red-400 transition-colors rounded-md hover:bg-white/[0.04]"
                        title={c.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                      >
                        {c.status === 'SUSPENDED' ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </td>`;

content = content.replace(
  /                      <button onClick=\{\(\) => handleEditContractor\(c\)\} className="p-1\.5 text-\[\#8B949E\] hover:text-brand-teal transition-colors rounded-md hover:bg-white\/\[0\.04\]">\s*<Edit2 className="w-3\.5 h-3\.5" \/>\s*<\/button>\s*<\/td>/,
  `                      <button onClick={() => handleEditContractor(c)} className="p-1.5 text-[#8B949E] hover:text-brand-teal transition-colors rounded-md hover:bg-white/[0.04]">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>` + contractorSuspend
);

content = content.replace(
  /<tr key=\{c\.id\} onClick=\{\(\) => handleEditContractor\(c\)\} className=\{\`hover:bg-brand-bg\/50 transition-colors cursor-pointer\`\}>/,
  "<tr key={c.id} onClick={() => handleEditContractor(c)} className={`hover:bg-brand-bg/50 transition-colors cursor-pointer ${c.status === 'SUSPENDED' ? 'opacity-60' : ''}`}>"
);

content = content.replace(
  /<div className="font-medium text-\[\#E6EDF3\] flex items-center">\s*\{c\.company_name\}\s*<\/div>/,
  `<div className="font-medium text-[#E6EDF3] flex items-center">
                            {c.company_name}
                            {c.status === 'SUSPENDED' && (
                              <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
                                SUSPENDED
                              </span>
                            )}
                          </div>`
);

fs.writeFileSync(file, content);

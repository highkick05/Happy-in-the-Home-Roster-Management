import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Add 'Type' column for PROVIDERS
    old_th = "{activeTab === 'CLIENTS' && <th className=\"px-4 py-2 font-semibold\">Provider & Services</th>}"
    new_th = "{activeTab === 'PROVIDERS' && <th className=\"px-4 py-2 font-semibold\">Type</th>}\n                {activeTab === 'CLIENTS' && <th className=\"px-4 py-2 font-semibold\">Provider & Services</th>}"
    text = text.replace(old_th, new_th)

    # Modify PROVIDERS row to have the new column
    old_row = """                          <div className="text-[#8B949E] text-xs mt-0.5">Joined {new Date(p.created_at).toLocaleDateString()}</div>
                          <div className="flex gap-2 items-center mt-1">
                            <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider bg-[#1d1f23] text-brand-teal border border-brand-teal/20">
                              {p.provider_type || 'NDIS'}
                            </span>
                            {(p.provider_type === 'Home Care' && p.management_fee !== undefined) && (
                              <span className="text-[10px] text-[#8B949E]">
                                {p.management_fee}% Fee
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">"""
    
    new_row = """                          <div className="text-[#8B949E] text-xs mt-0.5">Joined {new Date(p.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 items-center">
                        <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider bg-[#1d1f23] text-brand-teal border border-brand-teal/20">
                          {p.provider_type || 'NDIS'}
                        </span>
                        {(p.provider_type === 'Home Care' && p.management_fee !== undefined) && (
                          <span className="text-[10px] text-[#8B949E]">
                            {p.management_fee}% Fee
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">"""
    
    text = text.replace(old_row, new_row)
    
    # Also fix colSpan for empty row
    old_colspan = "{(activeTab === 'PROVIDERS' && providers.length === 0) && (\n                <tr><td colSpan={3}"
    new_colspan = "{(activeTab === 'PROVIDERS' && providers.length === 0) && (\n                <tr><td colSpan={4}"
    text = text.replace(old_colspan, new_colspan)

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Directory/StaffClientsView.tsx')

import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Top title - condense padding/margins
    text = text.replace('className="p-3 border-b border-border-subtle flex flex-col gap-2 relative bg-brand-bg"', 'className="px-4 py-2.5 border-b border-border-subtle flex flex-col gap-1.5 relative bg-brand-bg"')

    # Staff Compliance Matrix List Item
    text = text.replace('className={`p-4 flex flex-col', 'className={`px-4 py-2.5 flex flex-col')
    text = text.replace('className="font-medium text-[#E6EDF3] text-sm flex items-center"', 'className="font-medium text-[#E6EDF3] text-[13px] flex items-center"')

    # Expanded Details Panel
    text = text.replace('className="p-6 bg-[#0E0E10] border-t border-border-subtle shadow-inner"', 'className="p-4 bg-[#0E0E10] border-t border-border-subtle shadow-inner"')
    text = text.replace('className="mb-6"', 'className="mb-4"')
    
    # Document Card
    text = text.replace('className={`p-4 rounded-lg border flex flex-col justify-between h-full min-h-[140px]', 'className={`px-4 py-3 rounded-lg border flex flex-col justify-between h-full min-h-[120px]')
    text = text.replace('className="text-xs font-semibold text-[#E6EDF3] leading-tight"', 'className="text-[11px] font-semibold text-[#E6EDF3] leading-tight"')
    
    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Compliance/ComplianceDashboard.tsx')

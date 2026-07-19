import re

with open('src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

# Main layout spacing
text = text.replace('space-y-6', 'space-y-3')
text = text.replace('gap-4', 'gap-2')

# Main title and subtitle
text = text.replace('text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight mb-2', 'text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0')
text = text.replace('text-[#8B949E] text-sm mt-1', 'text-[#8B949E] text-xs mt-0')

# Tabs
text = text.replace('px-4 py-2 text-[13px] rounded-md', 'px-3 py-1.5 text-xs rounded-md')
text = text.replace('w-4 h-4 mr-2', 'w-3.5 h-3.5 mr-2')

# Sub headers (like Global Evidence Ledger)
text = text.replace('p-4 border-b border-border-subtle flex flex-col gap-3 relative', 'p-3 border-b border-border-subtle flex flex-col gap-2 relative')
text = text.replace('text-base font-medium text-[#E6EDF3] flex items-center mb-1', 'text-sm font-medium text-[#E6EDF3] flex items-center mb-0.5')
text = text.replace('text-base font-medium text-[#E6EDF3]', 'text-sm font-medium text-[#E6EDF3]')

# Form inputs and dropdowns in filters
text = text.replace('text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider', 'text-[9px] font-semibold text-[#8B949E] uppercase tracking-wider')
text = text.replace('px-2.5 py-1.5 pl-8 text-xs', 'px-2.5 py-1 pl-7 text-xs')
text = text.replace('px-2.5 py-1.5 text-xs', 'px-2.5 py-1 text-xs')
text = text.replace('min-h-[30px]', 'min-h-[26px]')
text = text.replace('h-[30px]', 'h-[26px]')
text = text.replace('px-3 py-1.5 bg-gradient-to-r', 'px-2.5 py-1 bg-gradient-to-r')

# Tables
text = text.replace('px-4 py-3', 'px-3 py-2')
text = text.replace('px-4 py-8', 'px-3 py-6')
text = text.replace('text-xs text-[#E6EDF3] uppercase tracking-wider bg-zinc-800', 'text-[10px] text-[#8B949E] uppercase tracking-wider bg-zinc-800 font-semibold')
text = text.replace('text-sm border-collapse', 'text-xs border-collapse')

# Text sizes inside tables and other cards
text = text.replace('text-sm text-[#8B949E]', 'text-xs text-[#8B949E]')

with open('src/components/Compliance/ComplianceDashboard.tsx', 'w') as f:
    f.write(text)

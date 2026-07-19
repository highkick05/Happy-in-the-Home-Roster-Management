import re

with open('src/components/Dashboard/StaffActivityReport.tsx', 'r') as f:
    text = f.read()

# Space-y
text = text.replace('space-y-6 min-h-[calc(100vh-120px)]', 'space-y-2 min-h-[calc(100vh-120px)]')
text = text.replace('flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0', 'flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0')

# Title
text = text.replace('text-2xl font-sans font-semibold', 'text-base font-sans font-semibold')
text = text.replace('text-[#8B949E] text-sm mt-1', 'text-[#8B949E] text-xs mt-0')
text = text.replace('w-6 h-6 mr-2', 'w-4 h-4 mr-2')

# Dropdowns and inputs
text = text.replace('text-[#E6EDF3] text-sm rounded-md px-3 py-1.5', 'text-[#E6EDF3] text-xs rounded-md px-2 py-1')
text = text.replace('rounded-md px-3 py-1.5 focus-within', 'rounded-md px-2 py-1 focus-within')
text = text.replace('text-[#E6EDF3] text-sm', 'text-[#E6EDF3] text-xs')
text = text.replace('gap-2 px-3 py-1.5 bg-brand-navy', 'gap-1 px-2 py-1 bg-brand-navy')
text = text.replace('text-[#E6EDF3] rounded-md text-sm transition-colors border border-border-subtle', 'text-[#E6EDF3] rounded-md text-xs transition-colors border border-border-subtle')
text = text.replace('px-3 py-2 bg-brand-navy hover:bg-[#1f262e] text-[#E6EDF3] rounded-md text-sm', 'px-2 py-1 bg-brand-navy hover:bg-[#1f262e] text-[#E6EDF3] rounded-md text-xs')
text = text.replace('px-5 py-4 text-center', 'px-3 py-2 text-center')
text = text.replace('px-5 py-4 text-right', 'px-3 py-2 text-right')
text = text.replace('px-5 py-4 min-w-[150px]', 'px-3 py-2 min-w-[150px]')
text = text.replace('px-5 py-4 min-w-[200px]', 'px-3 py-2 min-w-[200px]')
text = text.replace('px-5 py-3', 'px-3 py-2')
text = text.replace('text-sm text-[#8B949E] relative', 'text-xs text-[#8B949E] relative')
text = text.replace('text-xs uppercase bg-brand-bg text-[#8B949E]', 'text-[10px] uppercase bg-brand-bg text-[#8B949E]')

with open('src/components/Dashboard/StaffActivityReport.tsx', 'w') as f:
    f.write(text)

import re

with open('src/components/Tasks/TaskCard.tsx', 'r') as f:
    text = f.read()

text = text.replace('font-bold text-xl truncate', 'font-semibold text-xs truncate tracking-wide')
text = text.replace('text-lg flex items-center gap-2 text-[#8B949E] min-w-0 overflow-hidden', 'text-[11px] flex items-center gap-2 text-[#8B949E] min-w-0 overflow-hidden')
text = text.replace('flex items-center text-lg font-medium tracking-tight px-3 py-1', 'flex items-center text-[10px] font-medium tracking-wide px-2 py-1')

with open('src/components/Tasks/TaskCard.tsx', 'w') as f:
    f.write(text)

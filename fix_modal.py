import re

with open('src/components/Tasks/TaskCard.tsx', 'r') as f:
    text = f.read()

text = text.replace('text-xl font-bold text-white', 'text-sm font-bold text-white tracking-wide')
text = text.replace('text-2xl font-bold text-white', 'text-base font-bold text-white')
text = text.replace('text-sm font-medium text-white', 'text-[11px] font-medium text-white')
text = text.replace('text-sm ${st.completed', 'text-[11px] ${st.completed')
text = text.replace('text-xs font-bold ring-2', 'text-[10px] font-bold ring-1')
text = text.replace('text-xs font-bold flex', 'text-[10px] font-bold flex')
text = text.replace('text-xs text-[#8B949E]', 'text-[10px] text-[#8B949E]')
text = text.replace('text-xs text-white', 'text-[11px] text-white')

with open('src/components/Tasks/TaskCard.tsx', 'w') as f:
    f.write(text)

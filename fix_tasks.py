import re

with open('src/components/Tasks/TasksView.tsx', 'r') as f:
    text = f.read()

# Change column header
text = text.replace('text-[14px] text-white tracking-widest uppercase font-sans', 'text-[10px] text-zinc-400 tracking-wider uppercase font-sans')
text = text.replace('font-bold text-[14px] text-white tracking-widest uppercase font-sans drop-shadow-sm', 'font-bold text-[10px] text-zinc-400 tracking-wider uppercase font-sans drop-shadow-sm')

# Change "Add task" button
text = text.replace('text-[12px] font-medium text-[#8B949E]', 'text-[11px] font-medium text-[#8B949E]')

with open('src/components/Tasks/TasksView.tsx', 'w') as f:
    f.write(text)

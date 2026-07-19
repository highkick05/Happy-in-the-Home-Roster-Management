import re

with open('src/components/Tasks/TaskCard.tsx', 'r') as f:
    text = f.read()

# Change task title
text = text.replace('text-[14px] font-medium leading-snug', 'text-xs font-semibold leading-snug tracking-wide')

# Change task description
text = text.replace('text-[12px] text-[#8B949E] line-clamp-2 mt-1', 'text-[11px] text-[#8B949E] line-clamp-2 mt-0.5')

# Change subtask title (it might be text-[11px] already but let's check what it is)
with open('src/components/Tasks/TaskCard.tsx', 'w') as f:
    f.write(text)

import re

with open('src/components/Roster/RosterCalendar.tsx', 'r') as f:
    text = f.read()

text = text.replace('text-violet-400 font-medium text-sm', 'text-violet-400 font-medium text-[10px]')
text = text.replace('text-[12px] bg-indigo-500/5', 'text-[10px] bg-indigo-500/5')

with open('src/components/Roster/RosterCalendar.tsx', 'w') as f:
    f.write(text)

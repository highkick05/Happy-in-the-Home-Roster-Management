import re

with open('src/components/Roster/RosterCalendar.tsx', 'r') as f:
    text = f.read()

text = text.replace('space-y-2 p-2 md:p-3 text-zinc-100', 'space-y-1 p-1 md:p-2 text-zinc-100')
text = text.replace('flex-1 bg-brand-bg p-0 md:p-4 rounded-lg', 'flex-1 bg-brand-bg p-0 md:p-2 rounded-lg')
text = text.replace('space-y-2 md:space-y-0 px-2 md:px-0 mt-1 md:mt-0', 'space-y-1 md:space-y-0 px-1 md:px-0 mt-0')
text = text.replace('mb-2 md:mb-0', 'mb-1 md:mb-0')

with open('src/components/Roster/RosterCalendar.tsx', 'w') as f:
    f.write(text)

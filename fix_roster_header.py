import re

with open('src/components/Roster/RosterCalendar.tsx', 'r') as f:
    text = f.read()

text = text.replace('space-y-4 p-2 md:p-5', 'space-y-2 p-2 md:p-3')

with open('src/components/Roster/RosterCalendar.tsx', 'w') as f:
    f.write(text)

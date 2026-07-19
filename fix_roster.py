import re

with open('src/components/Roster/RosterCalendar.tsx', 'r') as f:
    text = f.read()

# Change the selects and buttons text sizes
text = text.replace('text-[13px]', 'text-[11px]')

with open('src/components/Roster/RosterCalendar.tsx', 'w') as f:
    f.write(text)

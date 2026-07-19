import re

with open('src/components/Roster/RosterCalendar.tsx', 'r') as f:
    text = f.read()

text = text.replace('mb-6 md:mb-0', 'mb-2 md:mb-0')
text = text.replace('mt-2 md:mt-0', 'mt-1 md:mt-0')
text = text.replace('space-y-4 md:space-y-0', 'space-y-2 md:space-y-0')

with open('src/components/Roster/RosterCalendar.tsx', 'w') as f:
    f.write(text)

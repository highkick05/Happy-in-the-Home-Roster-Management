import sys

with open('src/components/Roster/RosterCalendar.tsx', 'r') as f:
    code = f.read()

with open('target.txt', 'r') as f:
    target = f.read()

with open('new_header.txt', 'r') as f:
    new_header = f.read()

if target in code:
    code = code.replace(target, new_header)
    with open('src/components/Roster/RosterCalendar.tsx', 'w') as f:
        f.write(code)
    print("Successfully patched!")
else:
    print("Target not found in code.")

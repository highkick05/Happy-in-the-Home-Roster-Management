import re

with open('src/components/Dashboard/StaffActivityReport.tsx', 'r') as f:
    text = f.read()

# Update remaining px-5
text = text.replace('px-5 py-4', 'px-3 py-2')
text = text.replace('px-5 py-10', 'px-3 py-10')

with open('src/components/Dashboard/StaffActivityReport.tsx', 'w') as f:
    f.write(text)

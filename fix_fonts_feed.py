import re

with open('src/components/ProgressNotes/ProgressNotesFeed.tsx', 'r') as f:
    text = f.read()

# I will increase sizes generally
text = text.replace('text-[10px]', 'text-[12px]')
text = text.replace('text-sm font-semibold', 'text-base font-semibold')
text = text.replace('text-[11px]', 'text-[13px]')

with open('src/components/ProgressNotes/ProgressNotesFeed.tsx', 'w') as f:
    f.write(text)

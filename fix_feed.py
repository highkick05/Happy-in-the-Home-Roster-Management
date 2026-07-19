import re

with open('src/components/ProgressNotes/ProgressNotesFeed.tsx', 'r') as f:
    text = f.read()

text = text.replace('text-[14px]', 'text-[11px]')
text = text.replace('text-[13px]', 'text-[11px]')
text = text.replace('text-[12px]', 'text-[10px]')
text = text.replace('text-[11px]', 'text-[10px]')
text = text.replace('text-lg font-semibold', 'text-sm font-semibold')
text = text.replace('text-xs', 'text-[10px]')

with open('src/components/ProgressNotes/ProgressNotesFeed.tsx', 'w') as f:
    f.write(text)

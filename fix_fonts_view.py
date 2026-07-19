import re

with open('src/components/ProgressNotes/ProgressNotesView.tsx', 'r') as f:
    text = f.read()

text = text.replace('text-sm font-semibold text-white mb-0', 'text-base font-semibold text-white mb-0')
text = text.replace('text-[10px] text-zinc-400', 'text-xs text-zinc-400')
text = text.replace('text-[9px] font-medium text-zinc-500', 'text-[10px] font-medium text-zinc-500')
text = text.replace('text-[11px] text-white', 'text-[13px] text-white')
text = text.replace('text-[11px]', 'text-[12px]')

with open('src/components/ProgressNotes/ProgressNotesView.tsx', 'w') as f:
    f.write(text)

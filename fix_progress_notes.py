import re

with open('src/components/ProgressNotes/ProgressNotesView.tsx', 'r') as f:
    text = f.read()

text = text.replace('mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4', 'mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2')
text = text.replace('text-lg font-bold text-white mb-0.5', 'text-sm font-semibold text-white mb-0')
text = text.replace('text-[12px] text-zinc-400', 'text-[10px] text-zinc-400')
text = text.replace('h-9 bg-brand-navy px-3', 'h-7 bg-brand-navy px-2')
text = text.replace('text-[10px] font-medium text-zinc-500', 'text-[9px] font-medium text-zinc-500')
text = text.replace('text-[13px] text-white', 'text-[11px] text-white')
text = text.replace('w-[120px]', 'w-[90px]')
text = text.replace('px-3 h-9 rounded-lg text-[12px]', 'px-2 h-7 rounded-md text-[11px]')

with open('src/components/ProgressNotes/ProgressNotesView.tsx', 'w') as f:
    f.write(text)

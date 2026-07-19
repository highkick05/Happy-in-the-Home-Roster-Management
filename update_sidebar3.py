import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

text = text.replace('max-h-24', 'max-h-28')

# Change titles
text = text.replace('text-[10px] font-bold text-zinc-500 mb-1 mt-1 px-2 uppercase tracking-wider', 'text-[9px] font-bold text-zinc-500/80 mb-0.5 mt-1 px-2 uppercase tracking-wider')
text = text.replace('text-[10px] font-bold text-zinc-500 mb-1 mt-3 px-2 uppercase tracking-wider', 'text-[9px] font-bold text-zinc-500/80 mb-0.5 mt-2 px-2 uppercase tracking-wider')
text = text.replace('text-[10px] font-bold text-zinc-500 mb-1 mt-5 px-2 uppercase tracking-wider', 'text-[9px] font-bold text-zinc-500/80 mb-0.5 mt-2 px-2 uppercase tracking-wider')

with open('src/App.tsx', 'w') as f:
    f.write(text)


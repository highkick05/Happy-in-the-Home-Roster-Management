import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# Change logo container pt-2 to pt-1
text = text.replace('pt-2 pb-0 px-1 flex flex-col', 'pt-1 pb-0 px-1 flex flex-col')

# Change Operations title margin
text = text.replace('text-[9px] font-bold text-zinc-500/80 mb-0.5 mt-1 px-2', 'text-[9px] font-bold text-zinc-500/80 mb-0.5 mt-0 px-2')

with open('src/App.tsx', 'w') as f:
    f.write(text)

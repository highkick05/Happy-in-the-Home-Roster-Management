import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# getNavClasses
text = text.replace('text-[11px] font-semibold tracking-wide transition-all duration-200 rounded-lg', 'text-xs font-semibold tracking-wide transition-all duration-200 rounded-lg')

# Section Titles
text = text.replace('text-[9px] font-bold text-zinc-500/80', 'text-[10px] font-bold text-zinc-500/80')

# Logged in as
text = text.replace('text-[10px] text-brand-teal font-medium tracking-wide truncate', 'text-[11px] text-brand-teal font-medium tracking-wide truncate')

# Switch Admin
text = text.replace('text-[10px] font-semibold tracking-wide bg-brand-teal/10', 'text-[11px] font-semibold tracking-wide bg-brand-teal/10')

with open('src/App.tsx', 'w') as f:
    f.write(text)

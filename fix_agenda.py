import re

with open('src/components/Roster/RosterCalendar.tsx', 'r') as f:
    text = f.read()

text = text.replace('text-sm md:text-lg', 'text-xs')
text = text.replace('text-base md:text-xl', 'text-[11px]')
text = text.replace('text-[14px] md:text-[15px]', 'text-xs')
text = text.replace('text-xs md:text-sm lg:text-base', 'text-[10px]')
text = text.replace('text-sm md:text-base lg:text-lg', 'text-xs')
text = text.replace('text-[10px] md:text-xs', 'text-[10px]')
text = text.replace('font-bold text-zinc-100 text-[11px] leading-tight tracking-wide truncate', 'font-semibold text-zinc-100 text-[11px] leading-tight tracking-wide truncate')
text = text.replace('text-2xl font-sans font-semibold', 'text-lg font-sans font-semibold')
text = text.replace('<span className="text-sm font-medium">{label}</span>', '<span className="text-xs font-semibold">{label}</span>')
text = text.replace('<span className="text-zinc-300 font-medium">{label}</span>', '<span className="text-zinc-300 text-xs font-semibold">{label}</span>')
text = text.replace('text-[11px] whitespace-nowrap tracking-wide flex items-center', 'text-[10px] whitespace-nowrap tracking-wide flex items-center')

with open('src/components/Roster/RosterCalendar.tsx', 'w') as f:
    f.write(text)

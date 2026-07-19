import re

with open('src/components/Files/FilesView.tsx', 'r') as f:
    text = f.read()

text = text.replace('px-6 pt-4 pb-4 flex-col lg:flex-row gap-4', 'px-6 pt-0 pb-3 flex-col lg:flex-row gap-2')
text = text.replace('text-2xl font-bold text-white tracking-tight', 'text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0')
text = text.replace('text-zinc-400 text-sm mt-1', 'text-zinc-400 text-xs mt-0')

# Top buttons
text = text.replace('gap-4', 'gap-2')
text = text.replace('px-4 py-2 bg-brand-teal hover:bg-teal-400 text-black text-sm font-semibold rounded-lg transition-colors shadow-sm cursor-pointer', 'px-3 py-1.5 bg-brand-teal hover:bg-teal-400 text-black text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer h-7')
text = text.replace('w-4 h-4 mr-2', 'w-3.5 h-3.5 mr-1.5')

# View mode buttons
text = text.replace('p-1.5 rounded-md transition-colors', 'p-1 rounded-md transition-colors')
text = text.replace('w-4 h-4', 'w-3.5 h-3.5') # This might replace icons inside too, which is okay for consistency

# Table fonts
text = text.replace('text-xs font-semibold text-zinc-500 uppercase tracking-wider', 'text-[10px] font-semibold text-zinc-500 uppercase tracking-wider')
text = text.replace('text-sm text-white', 'text-xs text-white')
text = text.replace('text-sm text-zinc-400', 'text-xs text-zinc-400')

with open('src/components/Files/FilesView.tsx', 'w') as f:
    f.write(text)

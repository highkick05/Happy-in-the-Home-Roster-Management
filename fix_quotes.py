import re

with open('src/components/Invoicing/QuotesView.tsx', 'r') as f:
    text = f.read()

# Buttons in header
text = text.replace('className="bg-brand-navy border border-border-subtle rounded-md text-[#E6EDF3] text-[13px] py-1.5 pl-9 pr-3 w-64 focus:outline-none focus:border-brand-teal transition-colors"', 'className="bg-brand-navy border border-border-subtle rounded-md text-[#E6EDF3] text-xs py-1 pl-8 pr-2 w-64 focus:outline-none focus:border-brand-teal transition-colors"')
text = text.replace('w-4 h-4 text-zinc-500 absolute left-3', 'w-3.5 h-3.5 text-zinc-500 absolute left-2.5')
text = text.replace('px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white shadow-sm text-[13px] font-medium rounded-md transition-colors h-9', 'px-2 py-1 bg-gradient-to-r from-brand-teal to-brand-green text-white shadow-sm text-xs font-medium rounded-md transition-colors h-7')
text = text.replace('text-[13px] font-medium transition-colors flex items-center shadow-sm h-9', 'text-xs font-medium transition-colors flex items-center shadow-sm h-7')
text = text.replace('text-[13px] text-white', 'text-xs text-white')

# Table fonts and padding
text = text.replace('px-4 py-4', 'px-3 py-2')
text = text.replace('px-4 py-3', 'px-3 py-2')
text = text.replace('px-4 py-12', 'px-3 py-10')
text = text.replace('text-xs font-semibold text-[#8B949E] uppercase tracking-wider', 'text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider')

with open('src/components/Invoicing/QuotesView.tsx', 'w') as f:
    f.write(text)

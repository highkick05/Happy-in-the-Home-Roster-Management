import re

with open('src/components/Invoicing/InvoicingView.tsx', 'r') as f:
    text = f.read()

# Dropdowns and buttons on right side
text = text.replace('text-[13px] text-[#E6EDF3]', 'text-xs text-[#E6EDF3]')
text = text.replace('py-1.5 bg-brand-navy border border-border-subtle rounded-md text-[13px]', 'py-1 bg-brand-navy border border-border-subtle rounded-md text-xs')
text = text.replace('focus:ring-brand-teal w-40 transition-colors h-9', 'focus:ring-brand-teal w-40 transition-colors h-7')
text = text.replace('px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white shadow-sm text-[13px]', 'px-2 py-1 bg-gradient-to-r from-brand-teal to-brand-green text-white shadow-sm text-xs')
text = text.replace('rounded-md transition-colors h-9 whitespace-nowrap', 'rounded-md transition-colors h-7 whitespace-nowrap')
text = text.replace('w-40 transition-colors h-9', 'w-32 transition-colors h-7')
text = text.replace('w-32 transition-colors h-7', 'w-40 transition-colors h-7')
text = text.replace('py-1.5 bg-brand-navy border', 'py-1 bg-brand-navy border')
text = text.replace('pl-3 pr-8', 'pl-2 pr-6')

with open('src/components/Invoicing/InvoicingView.tsx', 'w') as f:
    f.write(text)

import sys

with open('src/components/Invoicing/InvoicingView.tsx', 'r') as f:
    code = f.read()

# Change Generate Invoice
old_gen = 'bg-brand-navy hover:hover-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3]'
new_gen = 'bg-gradient-to-r from-brand-teal to-brand-green text-white shadow-sm'
code = code.replace(old_gen, new_gen)

# Change Upload Historical
old_up = 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-500'
new_up = 'bg-gradient-to-r from-brand-teal to-brand-green text-white shadow-sm'
code = code.replace(old_up, new_up)

with open('src/components/Invoicing/InvoicingView.tsx', 'w') as f:
    f.write(code)


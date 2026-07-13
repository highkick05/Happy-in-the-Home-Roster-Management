import sys

with open('src/components/Invoicing/QuotesView.tsx', 'r') as f:
    code = f.read()

# Change Generate Quote
old_gen = 'bg-brand-navy hover:hover-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3]'
new_gen = 'bg-gradient-to-r from-brand-teal to-brand-green text-white border-0'
code = code.replace(old_gen, new_gen)

with open('src/components/Invoicing/QuotesView.tsx', 'w') as f:
    f.write(code)


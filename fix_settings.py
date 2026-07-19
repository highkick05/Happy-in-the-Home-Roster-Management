import re

with open('src/components/Settings/SettingsView.tsx', 'r') as f:
    text = f.read()

# Layout
text = text.replace('space-y-6', 'space-y-3')
text = text.replace('gap-4', 'gap-2')

# Main title
text = text.replace('text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight mb-2 md:mb-0', 'text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0')

# Tabs at top
text = text.replace('px-3 py-1.5 text-[13px] rounded-md transition-colors', 'px-3 py-1 text-[11px] rounded-md transition-colors uppercase tracking-wider')

with open('src/components/Settings/SettingsView.tsx', 'w') as f:
    f.write(text)

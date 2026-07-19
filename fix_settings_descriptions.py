import re

with open('src/components/Settings/SettingsView.tsx', 'r') as f:
    text = f.read()

text = text.replace('text-sm text-[#8B949E] mt-1', 'text-xs text-[#8B949E] mt-0')
text = text.replace('text-sm text-[#8B949E]', 'text-xs text-[#8B949E]')

with open('src/components/Settings/SettingsView.tsx', 'w') as f:
    f.write(text)

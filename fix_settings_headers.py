import re

with open('src/components/Settings/SettingsView.tsx', 'r') as f:
    text = f.read()

# Sub headers (h3)
text = text.replace('text-lg font-medium text-[#E6EDF3] mb-4', 'text-sm font-medium text-[#E6EDF3] mb-2')
text = text.replace('text-lg font-medium text-[#E6EDF3] mb-1', 'text-sm font-medium text-[#E6EDF3] mb-0.5')

# Forms inputs labels and values
text = text.replace('text-sm font-medium text-zinc-400 mb-1.5', 'text-xs font-medium text-zinc-400 mb-1')
text = text.replace('text-[14px] text-white', 'text-xs text-white')
text = text.replace('px-4 py-2.5 bg-black/40', 'px-3 py-1.5 bg-black/40 text-xs')
text = text.replace('px-4 py-2.5 w-full bg-black/40', 'px-3 py-1.5 w-full bg-black/40 text-xs')
text = text.replace('px-4 py-3 border-b border-border-subtle flex justify-between items-center', 'px-3 py-2 border-b border-border-subtle flex justify-between items-center')
text = text.replace('p-6 space-y-6', 'p-4 space-y-4')
text = text.replace('p-4 border-b border-border-subtle', 'p-3 border-b border-border-subtle')

with open('src/components/Settings/SettingsView.tsx', 'w') as f:
    f.write(text)

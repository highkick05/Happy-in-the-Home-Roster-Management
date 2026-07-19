import re

files_to_fix = [
    'src/components/Settings/DatabaseSettings.tsx',
    'src/components/Settings/TestingChecklist.tsx',
    'src/components/Settings/FundingTypesSettings.tsx'
]

for file_path in files_to_fix:
    with open(file_path, 'r') as f:
        text = f.read()

    # Sub headers (h3)
    text = text.replace('text-lg font-semibold', 'text-sm font-semibold')
    text = text.replace('text-lg font-medium', 'text-sm font-medium')
    text = text.replace('mb-4', 'mb-2')
    text = text.replace('mb-2', 'mb-1') # Only if it was mb-2 before, it becomes mb-1
    text = text.replace('mb-1', 'mb-0.5')

    # General text sizes
    text = text.replace('text-sm text-[#8B949E]', 'text-xs text-[#8B949E]')
    text = text.replace('text-sm text-zinc-400', 'text-xs text-zinc-400')
    
    # Table texts and paddings
    text = text.replace('px-4 py-3', 'px-3 py-2')
    text = text.replace('p-6', 'p-4')
    text = text.replace('p-4', 'p-3')
    text = text.replace('px-4 py-2 text-[14px]', 'px-3 py-1 text-xs')
    text = text.replace('px-4 py-2.5', 'px-3 py-1.5')

    with open(file_path, 'w') as f:
        f.write(text)

import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # tabs
    text = text.replace('px-6 py-4 text-[13px]', 'px-4 py-2 text-xs')
    # providers text
    text = text.replace('px-6 py-4 text-[14px]', 'px-4 py-2 text-xs')
    
    # Add button
    text = text.replace('px-4 py-2 bg-gradient-to-r', 'px-3 py-1.5 bg-gradient-to-r')
    text = text.replace('text-[13px] font-medium rounded-md', 'text-xs font-medium rounded-md')

    # Table head
    text = text.replace('text-xs uppercase tracking-wider text-[#8B949E]', 'text-[10px] uppercase tracking-wider text-[#8B949E]')
    text = text.replace('px-4 py-3 font-semibold', 'px-4 py-2 font-semibold')

    # Table body
    text = text.replace('tbody className="divide-y divide-border-subtle text-[13px]"', 'tbody className="divide-y divide-border-subtle text-xs"')
    text = text.replace('px-4 py-2 sm:py-2.5', 'px-4 py-2')
    text = text.replace('px-4 py-2 sm:py-3', 'px-4 py-2')

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Directory/StaffClientsView.tsx')

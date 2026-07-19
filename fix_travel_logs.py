import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Title
    text = text.replace('text-xl font-bold text-white flex items-center gap-2', 'text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0 flex items-center gap-2')
    text = text.replace('w-5 h-5 text-brand-teal', 'w-4 h-4 text-brand-teal')
    
    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/TravelLogsView.tsx')

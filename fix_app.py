import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    old_main = '<main className={`flex-1 overflow-auto print:overflow-visible ${location.pathname.includes(\'/files\') || location.pathname.includes(\'/tasks\') ? \'p-0\' : location.pathname.includes(\'/roster\') || location.pathname.includes(\'/kiosk\') ? \'p-0 md:pt-4 md:pb-6 md:px-8\' : \'p-4 md:pt-4 md:pb-6 md:px-8\'} print:p-0 relative`}>'
    new_main = '<main className={`flex-1 ${location.pathname.includes(\'/travel-logs\') || location.pathname.includes(\'/vehicles\') || location.pathname.includes(\'/roster\') || location.pathname.includes(\'/kiosk\') || location.pathname.includes(\'/files\') || location.pathname.includes(\'/tasks\') ? \'overflow-hidden flex flex-col min-h-0\' : \'overflow-auto\'} print:overflow-visible ${location.pathname.includes(\'/files\') || location.pathname.includes(\'/tasks\') ? \'p-0\' : location.pathname.includes(\'/roster\') || location.pathname.includes(\'/kiosk\') ? \'p-0 md:pt-4 md:pb-6 md:px-8\' : \'p-4 md:pt-4 md:pb-6 md:px-8\'} print:p-0 relative`}>'
    
    text = text.replace(old_main, new_main)

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/App.tsx')

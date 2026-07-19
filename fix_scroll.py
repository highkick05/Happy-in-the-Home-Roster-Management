import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Fix outer container
    text = text.replace('<div className="flex flex-col h-full bg-brand-bg relative min-h-screen">', '<div className="flex flex-col h-full bg-brand-bg relative overflow-hidden">')

    # Fix inner container
    text = text.replace('<div className="p-2 pb-16 flex flex-col flex-1 space-y-2 w-full">', '<div className="p-2 pb-6 flex flex-col flex-1 space-y-2 w-full overflow-hidden">')

    # Fix table container
    text = text.replace('<div className="bg-brand-navy/50 rounded-xl border border-border-subtle overflow-hidden">\n          <div className="overflow-x-auto">', '<div className="bg-brand-navy/50 rounded-xl border border-border-subtle flex-1 flex flex-col min-h-0">\n          <div className="overflow-auto flex-1">')

    # Make table header sticky
    text = text.replace('<tr className="bg-brand-navy border-b border-border-subtle text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold">', '<tr className="bg-brand-navy border-b border-border-subtle text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold sticky top-0 z-10">')

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/TravelLogsView.tsx')

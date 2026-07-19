import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    text = text.replace(
        '<table className="w-full text-left text-sm text-zinc-300">',
        '<table className="w-full text-left text-xs text-zinc-300">'
    )
    
    text = text.replace(
        '<thead className="text-xs text-[#8B949E] uppercase tracking-wider bg-brand-bg border-b border-border-subtle">',
        '<thead className="text-[11px] text-[#8B949E] uppercase tracking-wider bg-brand-bg border-b border-border-subtle">'
    )
    
    text = text.replace(
        '<td className="px-3 py-2 text-xs max-w-4xl text-[#E6EDF3] truncate"',
        '<td className="px-3 py-2 text-[11px] max-w-4xl text-[#E6EDF3] truncate"'
    )

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Compliance/ComplianceDashboard.tsx')

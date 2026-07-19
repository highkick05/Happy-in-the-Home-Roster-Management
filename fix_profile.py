import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Main wrapper padding
    text = text.replace('<div className="max-w-4xl mx-auto py-8">', '<div className="max-w-4xl mx-auto py-4 px-4 md:px-0">')
    
    # Main header
    old_header = """      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight mb-6">Your Profile</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your personal and employment details.</p>
      </div>"""
    new_header = """      <div className="mb-4">
        <h1 className="text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0">Your Profile</h1>
        <p className="text-zinc-400 text-xs mt-0">Manage your personal and employment details.</p>
      </div>"""
    text = text.replace(old_header, new_header)

    # Section spacing
    text = text.replace('className="space-y-8"', 'className="space-y-4"')
    
    # Section paddings and headings
    text = text.replace('rounded-xl p-6 shadow-lg', 'rounded-xl p-4 shadow-lg')
    text = text.replace('className="text-lg font-medium text-white border-b border-white/[0.08] pb-3 mb-4"', 'className="text-[11px] uppercase tracking-wider font-semibold text-white border-b border-white/[0.08] pb-2 mb-3"')
    
    # Input paddings
    text = text.replace('px-3 py-2 text-[13px]', 'px-2.5 py-1.5 text-xs')

    # Label text sizes
    text = text.replace('text-xs font-medium', 'text-[10px] uppercase tracking-wider font-semibold')
    
    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Profile/ProfileView.tsx')

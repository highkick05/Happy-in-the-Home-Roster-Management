import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Layout spacing
    text = text.replace('space-y-6', 'space-y-3')
    
    # Title
    text = text.replace('text-2xl font-bold text-white tracking-tight', 'text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0')
    text = text.replace('text-[#8B949E] text-sm mt-1', 'text-xs text-[#8B949E] mt-0')
    
    # Add Button
    text = text.replace('h-[38px] px-4 bg-brand-teal hover:bg-teal-600 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-2', 'h-8 px-3 bg-brand-teal hover:bg-teal-600 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5')
    text = text.replace('<Plus className="w-4 h-4" />', '<Plus className="w-3.5 h-3.5" />')
    
    # Table headers
    text = text.replace('text-xs uppercase tracking-wider text-[#8B949E] font-semibold', 'text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold')
    text = text.replace('px-3 py-3 border-r border-border-subtle/30', 'px-3 py-2 border-r border-border-subtle/30')
    
    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/VehiclesView.tsx')

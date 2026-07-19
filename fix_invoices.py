import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Layout spacing
    text = text.replace('space-y-4', 'space-y-3')
    text = text.replace('gap-4', 'gap-2')

    # Main title and headers
    text = text.replace('text-2xl font-bold text-white tracking-tight', 'text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0')
    text = text.replace('text-lg font-bold text-white tracking-tight', 'text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0')
    text = text.replace('text-lg font-medium text-[#E6EDF3] mb-4', 'text-sm font-medium text-[#E6EDF3] mb-2')
    text = text.replace('text-lg font-medium text-[#E6EDF3] mb-1', 'text-sm font-medium text-[#E6EDF3] mb-0.5')
    text = text.replace('text-base font-medium text-[#E6EDF3] mb-2', 'text-sm font-medium text-[#E6EDF3] mb-1')

    # Text descriptions
    text = text.replace('text-xs text-[#8B949E] mt-1', 'text-xs text-[#8B949E] mt-0')
    text = text.replace('text-sm text-[#8B949E] mt-1', 'text-xs text-[#8B949E] mt-0')

    # Buttons
    text = text.replace('px-4 py-2 bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 text-[13px] font-medium rounded-md', 'px-3 py-1.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-medium rounded-md h-7')
    text = text.replace('px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white border-0 text-[13px] font-medium rounded-md transition-colors shadow-sm w-full sm:w-auto h-9', 'px-2.5 py-1 bg-gradient-to-r from-brand-teal to-brand-green text-white border-0 text-xs font-medium rounded-md transition-colors shadow-sm w-full sm:w-auto h-7')
    text = text.replace('px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50 flex items-center shadow-sm whitespace-nowrap h-9', 'px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center shadow-sm whitespace-nowrap h-7')
    text = text.replace('w-4 h-4 mr-1.5', 'w-3.5 h-3.5 mr-1.5')
    
    # Inputs & Search
    text = text.replace('pl-9 pr-8 py-1.5 bg-brand-navy border border-border-subtle rounded-md text-[13px] text-[#E6EDF3] focus:outline-none focus:ring-1 focus:ring-brand-teal w-64 transition-colors h-9', 'pl-7 pr-7 py-1 bg-brand-navy border border-border-subtle rounded-md text-xs text-[#E6EDF3] focus:outline-none focus:ring-1 focus:ring-brand-teal w-56 transition-colors h-7')
    text = text.replace('w-4 h-4 absolute left-3 top-2.5', 'w-3.5 h-3.5 absolute left-2 top-1.5')

    # Tables
    text = text.replace('text-xs md:text-sm', 'text-xs')
    text = text.replace('px-3 py-2 font-semibold', 'px-3 py-1.5 font-semibold text-[10px]')
    text = text.replace('px-3 py-2 whitespace-nowrap', 'px-3 py-1.5 whitespace-nowrap')
    text = text.replace('px-3 py-2 text-[#E6EDF3]', 'px-3 py-1.5 text-[#E6EDF3]')
    text = text.replace('px-3 py-2 text-right', 'px-3 py-1.5 text-right')
    text = text.replace('px-3 py-2 font-medium', 'px-3 py-1.5 font-medium')
    text = text.replace('px-3 py-2', 'px-3 py-1.5')
    
    # Form labels & inputs
    text = text.replace('text-[12px]', 'text-[11px]')
    text = text.replace('text-[13px]', 'text-xs')
    text = text.replace('px-3 py-2', 'px-2.5 py-1.5')

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Invoicing/QuotesView.tsx')
fix_file('src/components/Invoicing/InvoicingView.tsx')


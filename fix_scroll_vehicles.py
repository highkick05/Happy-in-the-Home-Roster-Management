import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Fix outer container
    text = text.replace('<div className="flex-1 overflow-y-auto">', '<div className="flex flex-col h-full bg-brand-bg relative overflow-hidden">')

    # Fix inner container
    text = text.replace('<div className="w-full space-y-3">', '<div className="flex flex-col flex-1 p-4 space-y-3 min-h-0">')

    # Add shrink-0 to header wrapper
    text = text.replace('<div className="flex items-center justify-between">', '<div className="flex items-center justify-between shrink-0">')

    # Fix table container
    text = text.replace('<div className="bg-brand-navy rounded-xl border border-border-subtle overflow-x-auto min-h-[450px]">', '<div className="bg-brand-navy rounded-xl border border-border-subtle flex-1 flex flex-col min-h-0">\n          <div className="overflow-auto flex-1 relative">')
    
    # Close the extra div
    text = text.replace('          </table>\n        </div>\n      </div>', '          </table>\n          </div>\n        </div>\n      </div>')

    # Make table header sticky
    text = text.replace('<thead className="bg-brand-navy border-b border-border-subtle text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold">', '<thead className="bg-brand-navy border-b border-border-subtle text-[10px] uppercase tracking-wider text-[#8B949E] font-semibold sticky top-0 z-10">')

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/VehiclesView.tsx')

import re

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "r") as f:
    code = f.read()

# Client select container
old_client = """<div className="flex items-center space-x-2 bg-brand-navy px-3 py-1.5 rounded-lg border border-white/[0.05]">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Client</span>"""

new_client = """<div className="flex items-center space-x-2 h-9 bg-brand-navy px-3 rounded-lg border border-white/[0.05]">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Client</span>"""
code = code.replace(old_client, new_client)

# Dates container
old_dates = """<div className="flex items-center space-x-2 bg-brand-navy px-3 py-1.5 rounded-lg border border-white/[0.05]">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">From</span>"""

new_dates = """<div className="flex items-center space-x-2 h-9 bg-brand-navy px-3 rounded-lg border border-white/[0.05]">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">From</span>"""
code = code.replace(old_dates, new_dates)

# Button
old_btn = """<button className="bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-[#3A422F] transition-colors flex items-center">
              Time Critical Alert
            </button>"""

new_btn = """<button className="bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 px-3 h-9 rounded-lg text-[12px] font-medium hover:bg-[#3A422F] transition-colors flex items-center justify-center">
              Time Critical Alert
            </button>"""
code = code.replace(old_btn, new_btn)

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "w") as f:
    f.write(code)


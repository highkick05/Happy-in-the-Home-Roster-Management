import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace(
'''        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="bg-transparent border-b border-white/10 hover:border-white/30 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors cursor-pointer appearance-none">
          <option value="all" className="bg-[#1A2332]">All Staff</option>''',
'''        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="bg-transparent border-b border-white/10 hover:border-white/30 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors cursor-pointer appearance-none">
          <option value="all" className="bg-[#1A2332]">Assigned To (All)</option>'''
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)

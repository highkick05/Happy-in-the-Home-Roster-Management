import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

old_header = """          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center px-3 py-1 text-xs font-medium text-[#8B949E] bg-black/20 border border-white/[0.05] rounded-none hover:text-white hover:bg-white/[0.05] transition-colors"
          >"""

new_header = """          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center px-3 py-1 text-xs font-semibold bg-brand-teal text-white rounded-none hover:bg-brand-teal/90 transition-colors shadow-sm"
          >"""

code = code.replace(old_header, new_header)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)

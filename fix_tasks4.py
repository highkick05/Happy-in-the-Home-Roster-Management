import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace(
'''      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-2 pb-0 bg-transparent shrink-0">
        <div className="flex items-center">
          <button onClick={() => setIsCategoryModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-[#8B949E] hover:text-white bg-transparent hover:bg-white/5 border border-white/10 rounded-none transition-colors">
            <Settings2 className="w-3.5 h-3.5" />
            Categories
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4">''',
'''      <div className="flex flex-wrap items-center justify-end gap-4 px-6 pt-2 pb-0 bg-transparent shrink-0">
        <button onClick={() => setIsCategoryModalOpen(true)} className="flex items-center gap-1.5 bg-transparent border-b border-white/10 hover:border-white/30 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors uppercase tracking-wider font-semibold">
          <Settings2 className="w-3.5 h-3.5" />
          Categories
        </button>'''
)

code = code.replace(
'''            </CustomDatePicker>
          </div>
        </div>
        </div>
      </div>''',
'''            </CustomDatePicker>
          </div>
        </div>
      </div>'''
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)

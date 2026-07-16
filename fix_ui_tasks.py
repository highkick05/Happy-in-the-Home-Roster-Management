import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Fix layout for filters and date pickers
code = code.replace(
'''      <div className="flex flex-wrap items-center justify-end gap-4 p-3 bg-transparent shrink-0 mt-2 mr-2">''',
'''      <div className="flex flex-wrap items-center justify-end gap-4 px-3 pt-0 pb-2 bg-transparent shrink-0 -mt-2 mr-2 relative z-10">'''
)

code = code.replace(
'''        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold">From:</span>
          <CustomDatePicker 
            value={dateFrom} 
            onChange={(e: any) => setDateFrom(e.target ? e.target.value : '')}
            className="bg-transparent border-b border-white/10 hover:border-white/30 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors w-24"
            position="bottom"
          />
        </div>''',
'''        <div className="flex items-center gap-1.5 border-b border-white/10 hover:border-white/30 transition-colors pb-0.5">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold">From:</span>
          <div className="w-24">
            <CustomDatePicker 
              value={dateFrom} 
              onChange={(e: any) => setDateFrom(e.target ? e.target.value : '')}
              className="bg-transparent text-[11px] text-[#8B949E] hover:text-white px-0 outline-none w-full cursor-pointer h-full border-none"
              position="bottom"
              align="right"
            />
          </div>
        </div>'''
)

code = code.replace(
'''        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold">To:</span>
          <CustomDatePicker 
            value={dateTo} 
            onChange={(e: any) => setDateTo(e.target ? e.target.value : '')}
            className="bg-transparent border-b border-white/10 hover:border-white/30 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors w-24"
            position="bottom"
          />
        </div>''',
'''        <div className="flex items-center gap-1.5 border-b border-white/10 hover:border-white/30 transition-colors pb-0.5">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold">To:</span>
          <div className="w-24">
            <CustomDatePicker 
              value={dateTo} 
              onChange={(e: any) => setDateTo(e.target ? e.target.value : '')}
              className="bg-transparent text-[11px] text-[#8B949E] hover:text-white px-0 outline-none w-full cursor-pointer h-full border-none"
              position="bottom"
              align="right"
            />
          </div>
        </div>'''
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)

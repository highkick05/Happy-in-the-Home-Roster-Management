import sys

with open('src/components/Roster/RosterCalendar.tsx', 'r') as f:
    code = f.read()

target = """                    {/* Primary Actions */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleAddShift}
                        className="flex items-center justify-center px-3 py-1.5 bg-brand-teal hover:bg-brand-teal/90 text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full sm:w-auto min-w-[120px]"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Shift
                      </button>
                      <button 
                        onClick={handleAddRespiteBooking}
                        className="flex items-center justify-center px-3 py-1.5 bg-brand-teal hover:bg-brand-teal/90 text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full sm:w-auto min-w-[140px]"
                      >
                        <Bed className="w-4 h-4 mr-1.5" />
                        Add Respite / STA
                      </button>
                      <button 
                        onClick={handleAddHistShift}
                        className="flex items-center justify-center px-3 py-1.5 bg-brand-teal hover:bg-brand-teal/90 text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full sm:w-auto min-w-[150px]"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Historical Shift
                      </button>
                    </div>"""

replacement = """                    {/* Primary Actions */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleAddShift}
                        className="flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full sm:w-[170px]"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Shift
                      </button>
                      <button 
                        onClick={handleAddRespiteBooking}
                        className="flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full sm:w-[170px]"
                      >
                        <Bed className="w-4 h-4 mr-1.5" />
                        Add Respite / STA
                      </button>
                      <button 
                        onClick={handleAddHistShift}
                        className="flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full sm:w-[170px]"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Historical Shift
                      </button>
                    </div>"""

if target in code:
    with open('src/components/Roster/RosterCalendar.tsx', 'w') as f:
        f.write(code.replace(target, replacement))
    print("Replaced successfully")
else:
    print("Target not found.")
    

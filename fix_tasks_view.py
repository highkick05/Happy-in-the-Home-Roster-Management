import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Fix layout for filters and date pickers
code = code.replace(
'''      <div className="flex flex-wrap items-center gap-3 p-3 bg-black/10 border-b border-border-subtle shrink-0">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-black/20 border border-border-subtle text-xs text-white px-2 py-1.5 rounded-none outline-none">
          <option value="active">Active (To Do & In Progress)</option>
          <option value="done">Done</option>
          <option value="all">All Statuses</option>
        </select>
        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="bg-black/20 border border-border-subtle text-xs text-white px-2 py-1.5 rounded-none outline-none">
          <option value="all">All Staff</option>
          {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-black/20 border border-border-subtle text-xs text-white px-2 py-1.5 rounded-none outline-none">
          <option value="all">All Clients</option>
          {clientList.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#8B949E]">From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-black/20 border border-border-subtle text-xs text-white px-2 py-1 rounded-none outline-none" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#8B949E]">To:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-black/20 border border-border-subtle text-xs text-white px-2 py-1 rounded-none outline-none" />
        </div>
      </div>''',
'''      <div className="flex flex-wrap items-center justify-end gap-4 p-3 bg-transparent shrink-0 mt-2 mr-2">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent border-b border-transparent hover:border-white/20 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors cursor-pointer appearance-none">
          <option value="active" className="bg-[#1A2332]">Active Tasks</option>
          <option value="done" className="bg-[#1A2332]">Done</option>
          <option value="all" className="bg-[#1A2332]">All Statuses</option>
        </select>
        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="bg-transparent border-b border-transparent hover:border-white/20 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors cursor-pointer appearance-none">
          <option value="all" className="bg-[#1A2332]">All Staff</option>
          {staffList.map((s: any) => <option key={s.id} value={s.id} className="bg-[#1A2332]">{s.first_name} {s.last_name}</option>)}
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-transparent border-b border-transparent hover:border-white/20 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors cursor-pointer appearance-none">
          <option value="all" className="bg-[#1A2332]">All Clients</option>
          {clientList.map((c: any) => <option key={c.id} value={c.id} className="bg-[#1A2332]">{c.first_name} {c.last_name}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold">From:</span>
          <CustomDatePicker 
            value={dateFrom} 
            onChange={(e: any) => setDateFrom(e.target ? e.target.value : '')}
            onDateChange={(d: any) => setDateFrom(d ? d.toISOString().split('T')[0] : '')}
            className="bg-transparent border-b border-transparent hover:border-white/20 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors w-24"
            position="bottom"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold">To:</span>
          <CustomDatePicker 
            value={dateTo} 
            onChange={(e: any) => setDateTo(e.target ? e.target.value : '')}
            onDateChange={(d: any) => setDateTo(d ? d.toISOString().split('T')[0] : '')}
            className="bg-transparent border-b border-transparent hover:border-white/20 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors w-24"
            position="bottom"
          />
        </div>
      </div>'''
)

if 'import CustomDatePicker' not in code:
    code = code.replace("import { TaskCard, TaskModal } from './TaskCard';", "import { TaskCard, TaskModal } from './TaskCard';\nimport CustomDatePicker from '../ui/CustomDatePicker';")

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)

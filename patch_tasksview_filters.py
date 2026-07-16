import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Add states
states_pattern = re.compile(r'(const \[loading, setLoading\] = useState\(true\);)', re.DOTALL)
new_states = """\\1
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });"""

code = states_pattern.sub(new_states, code, count=1)


# Apply filters
render_pattern = re.compile(r'(const colTasks = tasks\.filter\(t => t\.category_id === col\.id\);)', re.DOTALL)
new_render = """const colTasks = tasks.filter(t => {
                    if (t.category_id !== col.id) return false;
                    
                    if (filterStatus === 'active' && t.status === 'Done') return false;
                    if (filterStatus === 'done' && t.status !== 'Done') return false;
                    
                    if (filterStaff !== 'all') {
                      const hasStaff = (t.staff && t.staff.some((s:any) => s.id.toString() === filterStaff)) || (t.assigned_to_id && t.assigned_to_id.toString() === filterStaff);
                      if (!hasStaff) return false;
                    }
                    
                    if (filterClient !== 'all') {
                      const hasClient = t.clients && t.clients.some((c:any) => c.id.toString() === filterClient);
                      if (!hasClient) return false;
                    }

                    if (dateFrom && t.created_at) {
                      if (new Date(t.created_at) < new Date(dateFrom)) return false;
                    }
                    
                    if (dateTo && t.created_at) {
                      const toDate = new Date(dateTo);
                      toDate.setHours(23, 59, 59, 999);
                      if (new Date(t.created_at) > toDate) return false;
                    }

                    return true;
                  });"""

code = render_pattern.sub(new_render, code)

# Add filter bar JSX
filter_bar_pattern = re.compile(r'(<div className="flex-1 overflow-x-auto overflow-y-hidden p-3">)', re.DOTALL)
new_filter_bar = """<div className="flex flex-wrap items-center gap-3 p-3 bg-black/10 border-b border-border-subtle shrink-0">
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
      </div>
      \\1"""

code = filter_bar_pattern.sub(new_filter_bar, code, count=1)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)

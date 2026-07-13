import re

with open('src/components/Invoicing/QuotesView.tsx', 'r') as f:
    code = f.read()

# Add Copy, ChevronUp, ChevronDown, CheckCircle to imports
if 'Copy' not in code:
    code = code.replace("import { Download", "import { Download, Copy, ChevronUp, ChevronDown, CheckCircle")
    
# Find the start of QuotesView function
view_start = code.find("export default function QuotesView() {")

# Insert states for pagination and sorting
states_injection = """
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };
"""

code = code[:view_start] + "export default function QuotesView() {" + states_injection + code[view_start + len("export default function QuotesView() {"):]

# Locate the filteredQuotes creation and insert sorting / slicing
filter_idx = code.find("const filteredQuotes = quotes.filter")
if filter_idx == -1:
    print("Could not find filteredQuotes")
else:
    # Find the end of filteredQuotes declaration
    filter_end = code.find(");", filter_idx) + 2
    
    sort_and_slice = """
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    let valA: any = '';
    let valB: any = '';

    if (sortField === 'date') {
      valA = new Date(a.activity_date || a.created_at).getTime();
      valB = new Date(b.activity_date || b.created_at).getTime();
    } else if (sortField === 'client') {
      valA = `${a.client_first_name} ${a.client_last_name}`.toLowerCase();
      valB = `${b.client_first_name} ${b.client_last_name}`.toLowerCase();
    } else if (sortField === 'id') {
      valA = (a.quote_number || '').toLowerCase();
      valB = (b.quote_number || '').toLowerCase();
    } else if (sortField === 'activity') {
      valA = (a.activity_name || '').toLowerCase();
      valB = (b.activity_name || '').toLowerCase();
    } else if (sortField === 'amount') {
      valA = Number(a.amount || 0);
      valB = Number(b.amount || 0);
    } else if (sortField === 'status') {
      valA = (a.status || '').toLowerCase();
      valB = (b.status || '').toLowerCase();
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedQuotes.length / pageSize);
  const paginatedQuotes = sortedQuotes.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize, sortField, sortDir]);
"""
    code = code[:filter_end] + sort_and_slice + code[filter_end:]


# Replace filteredQuotes.map with paginatedQuotes.map
code = code.replace("filteredQuotes.map(q => (", "paginatedQuotes.map(q => (")
code = code.replace("filteredQuotes.length === 0", "paginatedQuotes.length === 0")
code = code.replace("filteredQuotes.length > 0", "paginatedQuotes.length > 0")

# Header Buttons styling
# In QuotesView.tsx:
#      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
#        <div className="flex items-center space-x-3">
header_start = code.find('<div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">')
if header_start != -1:
    header_end_target = '<div className="flex-1 bg-brand-navy border border-border-subtle rounded-xl overflow-x-auto flex flex-col shadow-sm">'
    header_end = code.find(header_end_target, header_start)
    if header_end != -1:
        new_header_buttons = """      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteBulk}
              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors flex items-center shadow-sm h-9"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete ({selectedIds.length})
            </button>
          )}
          <div className="relative">
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-1.5 bg-brand-navy border border-border-subtle rounded-md text-[13px] text-[#E6EDF3] focus:outline-none focus:ring-1 focus:ring-brand-teal w-64 transition-colors h-9"
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8B949E]" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1.5 text-[#8B949E] hover:text-[#E6EDF3] transition-colors">&times;</button>}
          </div>
          <button
            onClick={() => { setEditingQuote(null); setShowGenerateModal(true); }}
            className="flex items-center px-3 py-1.5 bg-brand-navy hover:hover-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[13px] font-medium rounded-md transition-colors shadow-sm w-full sm:w-auto h-9"
          >
            Generate Quote
          </button>
        </div>
      </div>
"""
        code = code[:header_start] + new_header_buttons + code[header_end:]

# Sortable headers replacement
th_helper = """
  const renderSortableHeader = (field: string, label: string) => (
    <th 
      className="px-4 py-4 font-semibold cursor-pointer select-none hover:bg-brand-bg/50 transition-colors"
      onClick={() => {
        if (sortField === field) {
          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
          setSortField(field);
          setSortDir('asc');
        }
      }}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <div className="flex flex-col text-[#8B949E]">
          <ChevronUp className={`w-3 h-3 -mb-1 ${sortField === field && sortDir === 'asc' ? 'text-brand-teal' : 'opacity-30'}`} />
          <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-brand-teal' : 'opacity-30'}`} />
        </div>
      </div>
    </th>
  );
"""
ret_idx = code.find('  return (', view_start)
code = code[:ret_idx] + th_helper + code[ret_idx:]

table_head = """              <thead>
                <tr className="bg-brand-bg border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E] sticky top-0 z-10 transition-colors">
                  <th className="px-4 py-4 font-semibold w-12">
                    <input type="checkbox" className="rounded border-border-subtle bg-brand-navy text-brand-teal focus:ring-brand-teal focus:ring-offset-brand-navy" checked={selectedIds.length === paginatedQuotes.length && paginatedQuotes.length > 0} onChange={toggleAll} />
                  </th>
                  {renderSortableHeader('date', 'Date')}
                  {renderSortableHeader('id', 'Quote ID')}
                  {renderSortableHeader('client', 'Client')}
                  {renderSortableHeader('activity', 'Activity')}
                  {renderSortableHeader('amount', 'Amount')}
                  {renderSortableHeader('status', 'Status')}
                  <th className="px-4 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>"""

table_head_regex = re.compile(r'<thead>.*?</thead>', re.DOTALL)
code = table_head_regex.sub(table_head, code, count=1)


# Copy buttons in td
# Quote ID td: <td className="px-4 py-4 whitespace-nowrap font-medium text-[#E6EDF3]">{q.quote_number}</td>
id_td = """<td className="px-4 py-4 whitespace-nowrap font-medium text-[#E6EDF3]">
                      <div className="flex items-center space-x-2 group/copy">
                        <span>{q.quote_number}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(q.quote_number); }} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all">
                          {copiedText === q.quote_number ? <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>"""
code = re.sub(r'<td className="px-4 py-4 whitespace-nowrap font-medium text-\[#E6EDF3\]">\{q\.quote_number\}</td>', id_td, code)

# Client td: <td className="px-4 py-4 text-[#E6EDF3]">{q.client_first_name} {q.client_last_name}</td>
client_td = """<td className="px-4 py-4 text-[#E6EDF3]">
                      <div className="flex items-center space-x-2 group/copy">
                        <span>{q.client_first_name} {q.client_last_name}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(`${q.client_first_name || ''} ${q.client_last_name || ''}`.trim()); }} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all">
                          {copiedText === `${q.client_first_name || ''} ${q.client_last_name || ''}`.trim() ? <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>"""
code = re.sub(r'<td className="px-4 py-4 text-\[#E6EDF3\]">\{q\.client_first_name\} \{q\.client_last_name\}</td>', client_td, code)

# Amount td: <td className="px-4 py-4 font-medium text-[#E6EDF3]">${Number(q.amount).toFixed(2)}</td>
amount_td = """<td className="px-4 py-4 font-medium text-[#E6EDF3]">
                      <div className="flex items-center space-x-2 group/copy">
                        <span>${Number(q.amount).toFixed(2)}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(`$${Number(q.amount).toFixed(2)}`); }} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all">
                          {copiedText === `$${Number(q.amount).toFixed(2)}` ? <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>"""
code = re.sub(r'<td className="px-4 py-4 font-medium text-\[#E6EDF3\]">\$\{Number\(q\.amount\)\.toFixed\(2\)\}</td>', amount_td, code)


# Pagination footer
pagination_footer = """
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Controls */}
        {!loading && sortedQuotes.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle bg-brand-bg">
            <div className="flex items-center space-x-2 text-sm text-[#8B949E]">
              <span>Rows per page:</span>
              <select 
                value={pageSize} 
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-brand-navy border border-border-subtle rounded text-[#E6EDF3] text-sm py-1 px-2 focus:outline-none focus:border-brand-teal"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div className="flex items-center space-x-4 text-sm text-[#8B949E]">
              <span>
                {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, sortedQuotes.length)} of {sortedQuotes.length}
              </span>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-brand-navy disabled:opacity-50 transition-colors"
                >
                  Prev
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-brand-navy disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
"""
code = code.replace("              </tbody>\n            </table>\n          )}\n        </div>", pagination_footer)

with open('src/components/Invoicing/QuotesView.tsx', 'w') as f:
    f.write(code)


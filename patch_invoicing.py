import re

with open('src/components/Invoicing/InvoicingView.tsx', 'r') as f:
    code = f.read()

# Add Copy, ChevronUp, ChevronDown to imports
if 'Copy' not in code:
    code = code.replace("import { FileText", "import { FileText, Copy, ChevronUp, ChevronDown")
    
# Find the start of InvoicingView function
view_start = code.find("export default function InvoicingView() {")

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

code = code[:view_start] + "export default function InvoicingView() {" + states_injection + code[view_start + len("export default function InvoicingView() {"):]

# Locate the filteredInvoices usage and insert sorting / slicing
calc_idx = code.find("const totalAmount = filteredInvoices.reduce")

sort_and_slice = """
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let valA: any = '';
    let valB: any = '';

    if (sortField === 'date') {
      valA = new Date(a.start_time || a.created_at).getTime();
      valB = new Date(b.start_time || b.created_at).getTime();
    } else if (sortField === 'client') {
      valA = `${a.client_first_name} ${a.client_last_name}`.toLowerCase();
      valB = `${b.client_first_name} ${b.client_last_name}`.toLowerCase();
    } else if (sortField === 'id') {
      valA = getFallbackInvoiceNumber(a).toLowerCase();
      valB = getFallbackInvoiceNumber(b).toLowerCase();
    } else if (sortField === 'staff') {
      valA = a.staff_first_name ? `${a.staff_first_name} ${a.staff_last_name}`.toLowerCase() : '';
      valB = b.staff_first_name ? `${b.staff_first_name} ${b.staff_last_name}`.toLowerCase() : '';
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

  const totalPages = Math.ceil(sortedInvoices.length / pageSize);
  const paginatedInvoices = sortedInvoices.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [subTab, filterClient, filterStaff, pageSize, sortField, sortDir]);

"""
code = code[:calc_idx] + sort_and_slice + code[calc_idx:]

# Also change filteredInvoices.map to paginatedInvoices.map
code = code.replace("filteredInvoices.map(i => {", "paginatedInvoices.map(i => {")

# Header Buttons:
# The header section with buttons currently looks like:
#         <div className="flex items-center space-x-3">
#          {selectedInvoiceIds.length > 0 && ...
header_start = code.find('<div className="flex items-center space-x-3">')
if header_start != -1:
    header_end_target = '<div className="hidden md:flex'
    header_end = code.find(header_end_target, header_start)
    if header_end != -1:
        new_header_buttons = """
        <div className="flex flex-wrap items-center gap-2">
          {selectedInvoiceIds.length > 0 && (
            <button
              onClick={handleDeleteBulk}
              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors flex items-center shadow-sm h-9"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete ({selectedInvoiceIds.length})
            </button>
          )}
          {selectedInvoiceIds.length > 1 && (
            <button
              onClick={handleMergeInvoices}
              disabled={isMerging}
              className="bg-gradient-to-r from-brand-teal to-brand-green text-white px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50 flex items-center shadow-sm whitespace-nowrap h-9"
            >
              {isMerging ? 'Merging...' : `Merge (${selectedInvoiceIds.length})`}
            </button>
          )}
          
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="pl-3 pr-8 py-1.5 bg-brand-navy border border-border-subtle rounded-md text-[13px] text-[#E6EDF3] focus:outline-none focus:ring-1 focus:ring-brand-teal w-40 transition-colors h-9"
          >
            <option value="">All Clients</option>
            {clientsList.map((client, idx) => (
              <option key={idx} value={client}>{client}</option>
            ))}
          </select>

          <select
            value={filterStaff}
            onChange={(e) => setFilterStaff(e.target.value)}
            className="pl-3 pr-8 py-1.5 bg-brand-navy border border-border-subtle rounded-md text-[13px] text-[#E6EDF3] focus:outline-none focus:ring-1 focus:ring-brand-teal w-40 transition-colors h-9"
          >
            <option value="">All Staff</option>
            {staffList.map((staff, idx) => (
              <option key={idx} value={staff}>{staff}</option>
            ))}
          </select>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center px-3 py-1.5 bg-brand-navy hover:hover-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[13px] font-medium rounded-md transition-colors h-9 whitespace-nowrap"
          >
            Generate Invoice
          </button>
          
          {subTab === 'paid' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-500 text-[13px] font-medium rounded-md transition-colors h-9 whitespace-nowrap"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Upload Historical
            </button>
          )}
"""
        code = code[:header_start] + new_header_buttons + code[header_end:]


# Sortable headers replacement
# We will create a helper for th
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

# Let's inject th_helper right above return (
ret_idx = code.find('  return (', view_start)
code = code[:ret_idx] + th_helper + code[ret_idx:]

table_head = """              <thead>
                <tr className="bg-brand-bg border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E] sticky top-0 z-10 transition-colors">
                  <th className="px-4 py-4 font-semibold w-12">
                    <input type="checkbox" className="rounded border-border-subtle bg-brand-navy text-brand-teal focus:ring-brand-teal focus:ring-offset-brand-navy" checked={selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0} onChange={toggleAllInvoices} />
                  </th>
                  {renderSortableHeader('date', 'Date')}
                  {renderSortableHeader('client', 'Client')}
                  {renderSortableHeader('id', 'Invoice ID')}
                  {renderSortableHeader('staff', 'Staff Member')}
                  {renderSortableHeader('amount', 'Amount')}
                  {renderSortableHeader('status', 'Status')}
                  <th className="px-4 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>"""

table_head_regex = re.compile(r'<thead>.*?</thead>', re.DOTALL)
code = table_head_regex.sub(table_head, code, count=1)

# Add copy buttons to table cells
def cell_replacer(match):
    text = match.group(1)
    val = match.group(2)
    # We want a copy button next to the text
    # e.g. 
    # <td ...>
    #   <div className="flex items-center space-x-2 group/copy">
    #     <span>{val}</span>
    #     <button onClick={() => handleCopy(val_string)} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all"><Copy className="w-3.5 h-3.5" /></button>
    #   </div>
    # </td>
    return text

# We will just manually replace the relevant tds.
# Date td
# Date is:
# <td className="px-4 py-4 whitespace-nowrap text-[#E6EDF3]">
#   {(() => { ... })()}
# </td>
# Leave date alone.

# Client td:
# <td className="px-4 py-4 text-[#E6EDF3]">
#   {i.client_first_name} {i.client_last_name}
# </td>
client_td = """<td className="px-4 py-4 text-[#E6EDF3]">
                      <div className="flex items-center space-x-2 group/copy">
                        <span>{i.client_first_name} {i.client_last_name}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(`${i.client_first_name || ''} ${i.client_last_name || ''}`.trim()); }} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all">
                          {copiedText === `${i.client_first_name || ''} ${i.client_last_name || ''}`.trim() ? <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>"""
code = re.sub(r'<td className="px-4 py-4 text-\[#E6EDF3\]">\s*\{i\.client_first_name\} \{i\.client_last_name\}\s*</td>', client_td, code)

# Invoice ID td:
# <td className="px-4 py-4 whitespace-nowrap font-medium text-[#E6EDF3]">
#   {getFallbackInvoiceNumber(i)}
# </td>
id_td = """<td className="px-4 py-4 whitespace-nowrap font-medium text-[#E6EDF3]">
                      <div className="flex items-center space-x-2 group/copy">
                        <span>{getFallbackInvoiceNumber(i)}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(getFallbackInvoiceNumber(i)); }} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all">
                          {copiedText === getFallbackInvoiceNumber(i) ? <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>"""
code = re.sub(r'<td className="px-4 py-4 whitespace-nowrap font-medium text-\[#E6EDF3\]">\s*\{getFallbackInvoiceNumber\(i\)\}\s*</td>', id_td, code)


# Staff td:
# <td className="px-4 py-4 text-[#E6EDF3]">
#   {i.staff_first_name ? `${i.staff_first_name} ${i.staff_last_name}` : <span className="text-[#8B949E]">N/A</span>}
# </td>
staff_td = """<td className="px-4 py-4 text-[#E6EDF3]">
                      {i.staff_first_name ? (
                        <div className="flex items-center space-x-2 group/copy">
                          <span>{i.staff_first_name} {i.staff_last_name}</span>
                          <button onClick={(e) => { e.stopPropagation(); handleCopy(`${i.staff_first_name || ''} ${i.staff_last_name || ''}`.trim()); }} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all">
                            {copiedText === `${i.staff_first_name || ''} ${i.staff_last_name || ''}`.trim() ? <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : <span className="text-[#8B949E]">N/A</span>}
                    </td>"""
code = re.sub(r'<td className="px-4 py-4 text-\[#E6EDF3\]">\s*\{i\.staff_first_name \? `\$\{i\.staff_first_name\} \$\{i\.staff_last_name\}` : <span className="text-\[#8B949E\]">N/A</span>\}\s*</td>', staff_td, code)

# Amount td:
# <td className="px-4 py-4 font-medium text-[#E6EDF3]">
#   ${Number(i.amount).toFixed(2)}
# </td>
amount_td = """<td className="px-4 py-4 font-medium text-[#E6EDF3]">
                      <div className="flex items-center space-x-2 group/copy">
                        <span>${Number(i.amount).toFixed(2)}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(`$${Number(i.amount).toFixed(2)}`); }} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all">
                          {copiedText === `$${Number(i.amount).toFixed(2)}` ? <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>"""
code = re.sub(r'<td className="px-4 py-4 font-medium text-\[#E6EDF3\]">\s*\$\{Number\(i\.amount\)\.toFixed\(2\)\}\s*</td>', amount_td, code)

# Pagination footer
pagination_footer = """
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Controls */}
        {!loading && sortedInvoices.length > 0 && (
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
                {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, sortedInvoices.length)} of {sortedInvoices.length}
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

with open('src/components/Invoicing/InvoicingView.tsx', 'w') as f:
    f.write(code)


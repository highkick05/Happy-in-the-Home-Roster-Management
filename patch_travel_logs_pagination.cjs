const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const stateTarget = `  const [previewPhoto, setPreviewPhoto] = useState<{url: string, type: string} | null>(null);`;
const stateReplacement = `  const [previewPhoto, setPreviewPhoto] = useState<{url: string, type: string} | null>(null);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);`;
code = code.replace(stateTarget, stateReplacement);

const fetchTarget = `  const fetchLogs = async () => {
    setLoading(true);`;
const fetchReplacement = `  const fetchLogs = async () => {
    setLoading(true);
    setPage(1);`;
code = code.replace(fetchTarget, fetchReplacement);

const tableEndTarget = `          </div>
        </div>
      </div>
      
      {/* Vehicle Register Modal */}`;
const tableEndReplacement = `          </div>
          
          {expandedLogs.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-brand-navy">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#8B949E]">
                  Showing {Math.min((page - 1) * pageSize + 1, expandedLogs.length)} to {Math.min(page * pageSize, expandedLogs.length)} of {expandedLogs.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#8B949E]">Show</span>
                  <select 
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-black border border-border-subtle rounded px-2 py-1 text-sm text-[#E6EDF3] outline-none focus:border-brand-teal"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border border-border-subtle text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-bg transition-colors"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(Math.ceil(expandedLogs.length / pageSize), p + 1))}
                  disabled={page >= Math.ceil(expandedLogs.length / pageSize)}
                  className="px-3 py-1 rounded border border-border-subtle text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-bg transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Vehicle Register Modal */}`;
code = code.replace(tableEndTarget, tableEndReplacement);

const mapTarget = `expandedLogs.map(log => {`;
const mapReplacement = `expandedLogs.slice((page - 1) * pageSize, page * pageSize).map(log => {`;
code = code.replace(mapTarget, mapReplacement);

fs.writeFileSync(file, code);

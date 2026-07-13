import re

with open('src/components/Invoicing/QuotesView.tsx', 'r') as f:
    code = f.read()

view_start = code.find("export default function QuotesView() {")
code_after = code[view_start:]

states = """
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadClientId, setUploadClientId] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [allDbClients, setAllDbClients] = useState<any[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/invoices/form-data', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAllDbClients(data.clients || []);
        }
      } catch (e) {
        console.error('Failed to fetch clients:', e);
      }
    };
    if (token) {
      fetchClients();
    }
  }, [token]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadClientId || !uploadDate || !uploadFile) {
      alert("Please fill all fields and select a file.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('clientId', uploadClientId);
    formData.append('date', uploadDate);
    formData.append('file', uploadFile);

    try {
      const res = await fetch('/api/quotes/historical', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) throw new Error('Failed to upload historical quote');
      setShowUploadModal(false);
      setUploadClientId('');
      setUploadDate('');
      setUploadFile(null);
      fetchQuotes();
    } catch (err) {
      console.error(err);
      alert(String(err));
    } finally {
      setIsUploading(false);
    }
  };
"""

idx = code_after.find("const fetchQuotes")
code_after = code_after[:idx] + states + "\n  " + code_after[idx:]

# Add the Upload Historical button in Header
header_start = code_after.find('<button\n            onClick={() => { setEditingQuote(null); setShowGenerateModal(true); }}')
new_btn = """<button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white border-0 text-[13px] font-medium rounded-md transition-colors shadow-sm w-full sm:w-auto h-9 whitespace-nowrap"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Upload Historical
          </button>
          """
code_after = code_after[:header_start] + new_btn + code_after[header_start:]

# Add the modal in JSX
modal_code = """
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-xl shadow-2xl max-w-3xl w-full flex flex-col">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#18181b] rounded-t-xl shrink-0">
              <h2 className="text-lg font-bold text-white tracking-tight">Upload Historical Quote</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 bg-[#09090b]">
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Client</label>
                <select
                  required
                  value={uploadClientId}
                  onChange={e => setUploadClientId(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                >
                  <option value="">Select Client</option>
                  {allDbClients.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name || c.firstName} {c.last_name || c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Historical Date</label>
                <input
                  type="date"
                  required
                  value={uploadDate}
                  onChange={e => setUploadDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Quote PDF</label>
                <HistoricalDropzone uploadFile={uploadFile} setUploadFile={setUploadFile} />
              </div>
              <div className="pt-4 border-t border-white/[0.08] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 text-[13px] font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
"""
jsx_start = code_after.find('return (\n    <div className="flex-1 flex flex-col space-y-4">')
if jsx_start != -1:
    jsx_inner_start = jsx_start + len('return (\n    <div className="flex-1 flex flex-col space-y-4">')
    code_after = code_after[:jsx_inner_start] + modal_code + code_after[jsx_inner_start:]

code = code[:view_start] + code_after
with open('src/components/Invoicing/QuotesView.tsx', 'w') as f:
    f.write(code)


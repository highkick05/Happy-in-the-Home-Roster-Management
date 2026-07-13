import re

with open('src/components/Invoicing/QuotesView.tsx', 'r') as f:
    code = f.read()

# Add uploadActivity state
old_state = "  const [uploadDate, setUploadDate] = useState('');"
new_state = "  const [uploadDate, setUploadDate] = useState('');\n  const [uploadActivity, setUploadActivity] = useState('');"
code = code.replace(old_state, new_state)

# Append to formData
old_formdata = """    const formData = new FormData();
    formData.append('clientId', uploadClientId);
    formData.append('date', uploadDate);
    formData.append('file', uploadFile);"""
new_formdata = """    const formData = new FormData();
    formData.append('clientId', uploadClientId);
    formData.append('date', uploadDate);
    formData.append('file', uploadFile);
    if (uploadActivity) formData.append('activity', uploadActivity);"""
code = code.replace(old_formdata, new_formdata)

# Clear state
old_clear = """      setUploadDate('');
      setUploadFile(null);"""
new_clear = """      setUploadDate('');
      setUploadActivity('');
      setUploadFile(null);"""
code = code.replace(old_clear, new_clear)

# Add input in JSX
old_jsx = """              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Historical Date</label>
                <input
                  type="date"
                  required
                  value={uploadDate}
                  onChange={e => setUploadDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors [color-scheme:dark]"
                />
              </div>"""

new_jsx = """              <div>
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
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Activity Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Historical Quote"
                  value={uploadActivity}
                  onChange={e => setUploadActivity(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder:text-zinc-600"
                />
              </div>"""

code = code.replace(old_jsx, new_jsx)

with open('src/components/Invoicing/QuotesView.tsx', 'w') as f:
    f.write(code)
print("Replaced quotes view successfully")

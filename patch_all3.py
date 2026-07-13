import re

# 1. Update ProgressNotesView.tsx for Selects and DatePickers
with open("src/components/ProgressNotes/ProgressNotesView.tsx", "r") as f:
    view_code = f.read()

# Add CustomDatePicker import
if "import { CustomDatePicker }" not in view_code:
    view_code = view_code.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { CustomDatePicker } from '../ui/CustomDatePicker';")

# Update Client Select
view_code = re.sub(r'<select[^>]*value=\{selectedClientId\}[^>]*>', 
    '<select\n                value={selectedClientId}\n                onChange={(e) => setSelectedClientId(e.target.value)}\n                className="bg-brand-navy text-[13px] text-white outline-none min-w-[150px] border border-border-subtle rounded px-1.5 py-0.5"\n              >', 
    view_code)

# Add bg to Client Options
view_code = view_code.replace('<option value="">No clients available</option>', '<option value="" className="bg-brand-navy text-white">No clients available</option>')
view_code = view_code.replace('<option key={c.id} value={c.id}>{c.first_name || c.firstName} {c.last_name || c.lastName}</option>', '<option key={c.id} value={c.id} className="bg-brand-navy text-white">{c.first_name || c.firstName} {c.last_name || c.lastName}</option>')

# Update Date Pickers
# We need state for From and To dates.
if "const [fromDate, setFromDate] = useState<Date | null>(null);" not in view_code:
    view_code = view_code.replace("const [loading, setLoading] = useState(false);", 
        "const [loading, setLoading] = useState(false);\n  const [fromDate, setFromDate] = useState<Date | null>(null);\n  const [toDate, setToDate] = useState<Date | null>(null);")

old_from_to = """<span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">From</span>
              <input type="date" className="bg-transparent text-[12px] text-zinc-400 outline-none [color-scheme:dark]" />
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider ml-2">To</span>
              <input type="date" className="bg-transparent text-[12px] text-zinc-400 outline-none [color-scheme:dark]" />"""

new_from_to = """<span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">From</span>
              <div className="w-[120px]">
                <CustomDatePicker selected={fromDate} onDateChange={(d) => setFromDate(d)} />
              </div>
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider ml-2">To</span>
              <div className="w-[120px]">
                <CustomDatePicker selected={toDate} onDateChange={(d) => setToDate(d)} />
              </div>"""
view_code = view_code.replace(old_from_to, new_from_to)

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "w") as f:
    f.write(view_code)

# 2. Update ProgressNotesFeed.tsx for Text Color, Spacing, and Selects
with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    feed_code = f.read()

# Update Author Select
feed_code = feed_code.replace('<option value="">(Self)</option>', '<option value="" className="bg-brand-navy text-white">(Self)</option>')
feed_code = feed_code.replace('<option key={s.id} value={s.id}>{s.first_name || s.firstName} {s.last_name || s.lastName}</option>', '<option key={s.id} value={s.id} className="bg-brand-navy text-white">{s.first_name || s.firstName} {s.last_name || s.lastName}</option>')

# Update Tag Select in Edit
feed_code = feed_code.replace('<option value="Activity">Activity</option>', '<option value="Activity" className="bg-brand-navy text-white">Activity</option>')
feed_code = feed_code.replace('<option value="Behavioural">Behavioural</option>', '<option value="Behavioural" className="bg-brand-navy text-white">Behavioural</option>')
feed_code = feed_code.replace('<option value="Incident">Incident</option>', '<option value="Incident" className="bg-brand-navy text-white">Incident</option>')

# Update Text Color and spacing in renderNoteContent
feed_code = feed_code.replace('className="text-[14px] leading-relaxed block [&>p]:mb-1 [&>p]:last:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"', 
                              'className="text-[14px] leading-[1.4] text-[#E6EDF3] block [&>p]:mb-1 [&>p]:last:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"')
feed_code = feed_code.replace('className="text-[14px] text-zinc-200 leading-relaxed whitespace-pre-wrap block"', 
                              'className="text-[14px] text-[#E6EDF3] leading-[1.4] whitespace-pre-wrap block"')

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(feed_code)

# 3. Add CSS overrides to index.css
with open("src/index.css", "r") as f:
    css = f.read()

if "editorjs-wrapper" not in css:
    css += """

/* EditorJS specific overrides for Progress Notes */
.editorjs-wrapper .ce-block__content,
.editorjs-wrapper .ce-toolbar__content {
  max-width: 100% !important;
}
.editorjs-wrapper .ce-paragraph {
  line-height: 1.4 !important;
  padding: 0 !important;
  color: #E6EDF3 !important;
}
.editorjs-wrapper .ce-block {
  padding: 0.15em 0 !important;
}
.editorjs-wrapper .codex-editor__redactor {
  padding-bottom: 0 !important;
}
"""
    with open("src/index.css", "w") as f:
        f.write(css)

print("Updates applied")

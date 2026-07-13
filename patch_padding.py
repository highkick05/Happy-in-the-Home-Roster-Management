import re

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

# 1. Add New Note Container Padding
old_add_note = """<div className="bg-[#1C1D22] rounded-xl border border-white/[0.05] p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-[15px] font-semibold text-white">Add New Progress Note</h3>
          </div>"""

new_add_note = """<div className="bg-[#1C1D22] rounded-xl border border-white/[0.05] p-3 shadow-sm">
          <div className="mb-2">
            <h3 className="text-[15px] font-semibold text-white">Add New Progress Note</h3>
          </div>"""

code = code.replace(old_add_note, new_add_note)

# 2. Add New Note Footer Margin & Button Padding
old_footer = """          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 px-3 py-1.5 rounded text-[12px] font-medium hover:bg-[#3A422F] transition-colors disabled:opacity-50 flex items-center"
            >"""

new_footer = """          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 px-3 py-1 rounded text-[12px] font-medium hover:bg-[#3A422F] transition-colors disabled:opacity-50 flex items-center leading-none"
            >"""

code = code.replace(old_footer, new_footer)

# 3. Feed item padding
old_feed_item = """className="bg-[#1C1D22] rounded-xl border border-white/[0.05] p-5 shadow-sm\""""
new_feed_item = """className="bg-[#1C1D22] rounded-xl border border-white/[0.05] p-3 shadow-sm\""""

code = code.replace(old_feed_item, new_feed_item)

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(code)


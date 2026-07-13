import re

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

# 1. Update Tags Array
code = code.replace("['Behavioural', 'Health', 'Activity', 'Incident']", "['Activity', 'Behavioural', 'Incident']")

# 2. Update staffList.map
old_staff = "{staffList.map(s => ("
new_staff = "{staffList?.filter(s => s.role === 'STAFF').map(s => ("
code = code.replace(old_staff, new_staff)

# 3. Update the Add New Note layout
old_add_note = """        <div className="bg-[#1C1D22] rounded-xl border border-white/[0.05] overflow-hidden">
          <div className="px-3 py-2">
            <h3 className="text-[14px] font-semibold text-white">Add New Progress Note</h3>
          </div>
          <div className="p-0">
            <div className="bg-transparent text-white">
              <EditorJSWrapper """

new_add_note = """        <div className="bg-[#1C1D22] rounded-xl border border-white/[0.05] p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-[15px] font-semibold text-white">Add New Progress Note</h3>
          </div>
          <div className="border border-white/[0.05] rounded-lg overflow-hidden">
            <div className="bg-transparent text-white">
              <EditorJSWrapper """

code = code.replace(old_add_note, new_add_note)

old_footer = """            <div className="flex justify-end p-3 bg-[#1C1D22] border-t border-white/[0.05]">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 px-4 py-2 rounded-md text-[13px] font-medium hover:bg-[#3A422F] transition-colors disabled:opacity-50 flex items-center"
              >
                Submit Note
              </button>
            </div>
          </div>
        </div>"""

new_footer = """            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 px-3 py-1.5 rounded text-[12px] font-medium hover:bg-[#3A422F] transition-colors disabled:opacity-50 flex items-center"
            >
              Submit Note
            </button>
          </div>
        </div>"""

code = code.replace(old_footer, new_footer)

# Also fix the edit note tags select options
old_edit_tags = """                          <option value="Activity">Activity</option>
                          <option value="Health">Health</option>
                          <option value="Behavioural">Behavioural</option>
                          <option value="Incident">Incident</option>"""

new_edit_tags = """                          <option value="Activity">Activity</option>
                          <option value="Behavioural">Behavioural</option>
                          <option value="Incident">Incident</option>"""

code = code.replace(old_edit_tags, new_edit_tags)

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(code)


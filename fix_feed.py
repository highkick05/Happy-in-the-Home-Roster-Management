with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

import re

start_marker = "{/* Add New Note */}"
end_marker = "{/* Feed */}"

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_add_note = """{/* Add New Note */}
      {selectedClientId && (
        <div className="bg-[#1C1D22] rounded-xl border border-white/[0.05] p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-[15px] font-semibold text-white">Add New Progress Note</h3>
          </div>
          <div className="border border-white/[0.05] rounded-lg overflow-hidden">
            <div className="bg-transparent text-white">
              <EditorJSWrapper 
                ref={editorRef} 
                minHeight={80} 
                toolbarRight={
                  <div className="flex items-center gap-3">
                    {userRole === 'ADMIN' && (
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="text-zinc-500">Author:</span>
                        <select 
                          value={newNoteAuthorId}
                          onChange={(e) => setNewNoteAuthorId(e.target.value)}
                          className="bg-black/40 border border-white/[0.08] rounded px-2 py-1 text-white outline-none min-w-[100px]"
                        >
                          <option value="">(Self)</option>
                          {staffList?.filter(s => s.role === 'STAFF').map(s => (
                            <option key={s.id} value={s.id}>{s.first_name || s.firstName} {s.last_name || s.lastName}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="text-zinc-500">Tag:</span>
                      <div className="bg-[#1C1D22] border border-[#0B0C0E] rounded flex overflow-hidden">
                        {['Activity', 'Behavioural', 'Incident'].map(tag => (
                          <button
                            key={tag}
                            onClick={() => setNewNoteTags(tag)}
                            className={`px-3 py-1 transition-colors ${newNoteTags === tag ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-[#1C1D22]'}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
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
        </div>
      )}
      """
    code = code[:start_idx] + new_add_note + code[end_idx:]

    with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
        f.write(code)


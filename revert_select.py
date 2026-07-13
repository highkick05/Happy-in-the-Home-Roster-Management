with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

new_tag_ui = """<select 
                        value={newNoteTags}
                        onChange={(e) => setNewNoteTags(e.target.value)}
                        className="bg-black/40 border border-white/[0.08] rounded px-2 py-1 text-white outline-none min-w-[120px]"
                      >
                        <option value="Activity">Activity</option>
                        <option value="Health">Health</option>
                        <option value="Behavioural">Behavioural</option>
                        <option value="Incident">Incident</option>
                      </select>"""

old_tag_ui = """<div className="bg-[#1C1D22] border border-[#0B0C0E] rounded flex overflow-hidden">
                        {['Behavioural', 'Health', 'Activity', 'Incident'].map(tag => (
                          <button
                            key={tag}
                            onClick={() => setNewNoteTags(tag)}
                            className={`px-3 py-1 transition-colors ${newNoteTags === tag ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-[#1C1D22]'}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>"""

code = code.replace(new_tag_ui, old_tag_ui)

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(code)


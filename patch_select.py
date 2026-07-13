with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

# Replace the tag button group with a select
old_tag_ui = """<div className="bg-black/40 border border-white/[0.08] rounded flex overflow-hidden">
                        {['Behavioural', 'Health', 'Activity', 'Incident'].map(tag => (
                          <button
                            key={tag}
                            onClick={() => setNewNoteTags(tag)}
                            className={`px-3 py-1 transition-colors ${newNoteTags === tag ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>"""

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

code = code.replace(old_tag_ui, new_tag_ui)

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(code)


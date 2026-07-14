import re

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

old_prop = "  onDeleteNote?: (id: number) => Promise<void>;"
new_prop = "  onDeleteNote?: (source: 'SHIFT' | 'MANUAL', id: number) => Promise<void>;"
code = code.replace(old_prop, new_prop)

old_edit_btn = """                  <div className="flex items-center space-x-4">
                     <button 
                       onClick={() => handleStartEdit(note)}
                       className="text-zinc-400 hover:text-white flex items-center text-[12px] transition-colors"
                     >
                       <Pencil className="w-3.5 h-3.5 mr-1.5" />
                       Edit
                     </button>
                  </div>"""

new_edit_btn = """                  <div className="flex items-center space-x-4">
                     <button 
                       onClick={() => handleStartEdit(note)}
                       className="text-zinc-400 hover:text-white flex items-center text-[12px] transition-colors"
                     >
                       <Pencil className="w-3.5 h-3.5 mr-1.5" />
                       Edit
                     </button>
                     {(userRole === 'ADMIN' || currentUserId === note.author_id) && (
                       <button 
                         onClick={() => onDeleteNote && onDeleteNote(note.source, note.id)}
                         className="text-red-400/80 hover:text-red-400 flex items-center text-[12px] transition-colors"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                         Delete
                       </button>
                     )}
                  </div>"""
code = code.replace(old_edit_btn, new_edit_btn)

# Ensure staff_id check works for shift notes too, which might not have author_id, but the staff_id isn't in ProgressNote interface maybe?
# Wait, let's check ProgressNote interface
with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(code)

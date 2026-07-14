import re

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "r") as f:
    code = f.read()

# Replace onDeleteNote type in feed props
# Wait, feed props are imported or defined inline? ProgressNotesFeed is imported.
# In ProgressNotesView:

old_del = """  const handleDeleteNote = async (id: number) => {
    // Only support deleting manual notes for now or check source?
    // Wait, the feed doesn't pass source to delete... let's check
    const res = await fetch(`/api/progress-notes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
       // It might be a shift note or something, but usually only manual notes are deleted this way.
       console.error("Failed to delete");
       alert("Failed to delete note. You can only delete manual notes.");
       return;
    }
    await fetchNotes();
  };"""

new_del = """  const handleDeleteNote = async (source: 'SHIFT' | 'MANUAL', id: number) => {
    if (!confirm('Are you sure you want to delete this progress note?')) return;
    
    const url = source === 'SHIFT' 
      ? `/api/progress-notes/shifts/${id}` 
      : `/api/progress-notes/${id}`;
      
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
       console.error("Failed to delete");
       alert("Failed to delete note. You might not have permission.");
       return;
    }
    await fetchNotes();
  };"""

if "const handleDeleteNote = async (id: number)" in code:
    code = code.replace(old_del, new_del)
elif "const handleDeleteNote = async (id" in code:
    print("Found a variant of handleDeleteNote")

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "w") as f:
    f.write(code)

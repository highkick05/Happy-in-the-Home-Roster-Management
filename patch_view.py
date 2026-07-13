import re

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "r") as f:
    code = f.read()

delete_fn = """  const handleDeleteNote = async (id: number) => {
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
  };

  const handleEditNote"""
  
code = code.replace("  const handleEditNote", delete_fn)

code = code.replace("onEditNote={handleEditNote}", "onDeleteNote={handleDeleteNote}\n         onEditNote={handleEditNote}")

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "w") as f:
    f.write(code)


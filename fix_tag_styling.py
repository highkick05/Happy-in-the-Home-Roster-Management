import re

with open('src/components/ProgressNotes/ProgressNotesFeed.tsx', 'r') as f:
    text = f.read()

target = """                     <div className="mt-3 block pt-2">
                       <span className="inline-block bg-brand-navy border border-border-subtle px-2 py-1 rounded text-[11px] text-zinc-400 shadow-sm">
                         Tag: {note.tags}
                       </span>
                     </div>"""

replacement = """                     <div className="mt-3 block pt-2">
                       <span className={`inline-block border px-2 py-1 rounded text-[11px] shadow-sm ${note.tags?.includes('Incident') ? 'bg-red-500/20 border-red-500/30 text-red-400 font-medium' : 'bg-brand-navy border-border-subtle text-zinc-400'}`}>
                         Tag: {note.tags}
                       </span>
                     </div>"""

text = text.replace(target, replacement)

with open('src/components/ProgressNotes/ProgressNotesFeed.tsx', 'w') as f:
    f.write(text)

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

bad_str = """                     <div className="mt-3 block">
                       <span className="inline-block bg-brand-navy border border-border-subtle px-2 py-1 rounded text-[11px] text-zinc-400 shadow-sm">
                         Tag: {note.tags}
                       </span>
                     </div>
                       Tag: {note.tags}
                     </span>
                     </div>
                   )}"""

good_str = """                     <div className="mt-3 block pt-2">
                       <span className="inline-block bg-brand-navy border border-border-subtle px-2 py-1 rounded text-[11px] text-zinc-400 shadow-sm">
                         Tag: {note.tags}
                       </span>
                     </div>
                   )}"""

code = code.replace(bad_str, good_str)

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(code)


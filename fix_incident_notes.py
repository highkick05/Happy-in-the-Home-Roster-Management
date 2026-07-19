import re

with open('src/components/ProgressNotes/ProgressNotesFeed.tsx', 'r') as f:
    text = f.read()

target = """                allItems.push({ h: estH, el: (
            <div key={`${note.source}-${note.id}-${idx}`} className="bg-brand-navy rounded-xl border border-border-subtle p-3 shadow-sm mb-4 break-inside-avoid">"""

replacement = """                allItems.push({ h: estH, el: (
            <div key={`${note.source}-${note.id}-${idx}`} className={`rounded-xl border p-3 shadow-sm mb-4 break-inside-avoid ${note.tags?.includes('Incident') ? 'bg-red-500/10 border-red-500/50' : 'bg-brand-navy border-border-subtle'}`}>"""

text = text.replace(target, replacement)

with open('src/components/ProgressNotes/ProgressNotesFeed.tsx', 'w') as f:
    f.write(text)

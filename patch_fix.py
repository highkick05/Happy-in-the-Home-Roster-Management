with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

bad_snippet = """                }
              />
            </div>
          </div>
          </div>
          <div className="flex justify-end px-3 py-2 border-t border-border-subtle bg-black/10">"""

good_snippet = """                }
              />
            </div>
          </div>
          <div className="flex justify-end px-3 py-2 border-t border-border-subtle bg-black/10">"""

code = code.replace(bad_snippet, good_snippet)

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(code)


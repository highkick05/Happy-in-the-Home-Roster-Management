import re

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

old_feed_img = """              if (block.type === 'image') {
                return (
                  <div key={idx} className="my-4 flex flex-col items-start">
                    <img src={block.data.file.url} alt={block.data.caption || 'Image'} className="rounded max-w-full h-auto max-h-96" />
                    {block.data.caption && <div className="text-xs text-zinc-500 mt-1" dangerouslySetInnerHTML={{__html: block.data.caption}} />}
                  </div>
                );
              }"""

new_feed_img = """              if (block.type === 'image') {
                return (
                  <div key={idx} className="my-4 flex flex-col items-start">
                    <img src={block.data.file.url} alt="Image" className="rounded max-w-full h-auto max-h-96" />
                  </div>
                );
              }"""

code = code.replace(old_feed_img, new_feed_img)

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(code)


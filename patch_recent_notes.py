import re

with open("src/components/Directory/ClientDashboardView.tsx", "r") as f:
    code = f.read()

helper_fn = """
  // Helper to extract text from EditorJS JSON
  const getNotePreview = (notesStr: string) => {
    try {
      if (notesStr.startsWith('{') && notesStr.includes('"blocks"')) {
        const data = JSON.parse(notesStr);
        if (data && data.blocks) {
          const texts = data.blocks
            .filter((b: any) => b.type === 'paragraph' || b.type === 'header' || b.type === 'list')
            .map((b: any) => {
              if (b.type === 'list') {
                 return b.data.items.map((i: string) => i.replace(/<[^>]*>?/gm, '')).join(' ');
              }
              return (b.data.text || '').replace(/<[^>]*>?/gm, '');
            });
          const combined = texts.join(' ').trim();
          if (combined.length > 0) return combined;
          
          if (data.blocks.some((b: any) => b.type === 'image')) {
            return '[Image Attached]';
          }
        }
      }
    } catch (e) {
      // Ignore
    }
    // Fallback if not JSON or parsing fails
    return notesStr;
  };
"""

# Insert the helper fn just inside the ClientDashboardView component
# Let's find "export default function ClientDashboardView" and insert it after the prop destructuring

replace_target = "export default function ClientDashboardView({ client, onEditProfile, onBack }: ClientDashboardViewProps) {"
replacement = replace_target + helper_fn

code = code.replace(replace_target, replacement)

# Now replace {note.notes} with {getNotePreview(note.notes)}
code = code.replace("                         {note.notes}\n                       </div>", "                         {getNotePreview(note.notes)}\n                       </div>")

with open("src/components/Directory/ClientDashboardView.tsx", "w") as f:
    f.write(code)


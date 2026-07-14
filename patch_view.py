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

# Let's see if getNotePreview is already inside but in the wrong place.
if "const getNotePreview = (notesStr: string) => {" not in code:
    print("getNotePreview not found! Adding it.")
    replace_target = "export default function ClientDashboardView() {"
    replacement = replace_target + helper_fn
    code = code.replace(replace_target, replacement)
else:
    print("getNotePreview found.")
    # Check if it is inside the component!
    # Wait, in the previous script I did:
    # replace_target = "export default function ClientDashboardView({ client, onEditProfile, onBack }: ClientDashboardViewProps) {"
    # Since this target didn't exist, it wasn't replaced! But wait, I added it in the replace script!
    # If the target didn't exist, code didn't change! But I also replaced `{note.notes}` with `{getNotePreview(note.notes)}` which DID exist!
    
    replace_target = "export default function ClientDashboardView() {"
    replacement = replace_target + helper_fn
    code = code.replace(replace_target, replacement)


with open("src/components/Directory/ClientDashboardView.tsx", "w") as f:
    f.write(code)


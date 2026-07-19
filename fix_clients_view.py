import re

def fix_view(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    replacement = """                      <div className="flex items-center gap-3">
                        {c.avatar_url ? (
                          <img src={getAvatarUrl(c.avatar_url)} alt={`${c.first_name}`} className="w-7 h-7 rounded-full border border-white/[0.08] bg-[#151515] shrink-0 object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green flex items-center justify-center text-[11px] font-semibold shrink-0">
                            {initials || '?'}
                          </div>
                        )}
                        <div>"""

    text = text.replace(
        """                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {initials || '?'}
                        </div>
                        <div>""",
        replacement
    )

    with open(filepath, 'w') as f:
        f.write(text)

fix_view('src/components/Directory/StaffClientsView.tsx')

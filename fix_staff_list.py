import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Replacement 1: Update avatar display
    old_avatar = """<div className="w-7 h-7 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {initials || '?'}
                        </div>"""
    
    new_avatar = """{s.avatar_url ? (
                          <img src={s.avatar_url} alt={`${s.first_name}`} className="w-7 h-7 rounded-full border border-white/[0.08] bg-[#151515] shrink-0 object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center text-[11px] font-semibold shrink-0">
                            {initials || '?'}
                          </div>
                        )}"""

    text = text.replace(old_avatar, new_avatar)

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Directory/StaffClientsView.tsx')

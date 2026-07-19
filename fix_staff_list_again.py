import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Find the second occurrence which is in the providers mapping
    bad_avatar = """{s.avatar_url ? (
                          <img src={s.avatar_url} alt={`${s.first_name}`} className="w-7 h-7 rounded-full border border-white/[0.08] bg-[#151515] shrink-0 object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center text-[11px] font-semibold shrink-0">
                            {initials || '?'}
                          </div>
                        )}"""
    
    good_provider_avatar = """<div className="w-7 h-7 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {initials || '?'}
                        </div>"""

    # We need to replace the SECOND occurrence of bad_avatar
    parts = text.split(bad_avatar)
    if len(parts) == 3:
        text = parts[0] + bad_avatar + parts[1] + good_provider_avatar + parts[2]
    elif len(parts) == 4:
        # Wait, if there are 4 parts, it happened 3 times? Let's check how many there are.
        # Let's just use string replace but conditionally based on "p.company_name" being nearby.
        pass

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Directory/StaffClientsView.tsx')

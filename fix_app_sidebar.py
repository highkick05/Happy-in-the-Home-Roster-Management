import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    old_div = '<div className="mb-1 px-2 text-[11px] text-brand-teal font-medium tracking-wide truncate">Logged in as {user?.firstName}</div>'
    new_div = """<div className="mb-2 px-2 flex items-center gap-2 text-[11px] text-brand-teal font-medium tracking-wide truncate">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.firstName} className="w-5 h-5 rounded-full object-cover shrink-0 bg-[#151515] border border-brand-teal/20" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0 text-[9px] font-bold">
                  {user?.firstName?.charAt(0) || '?'}
                </div>
              )}
              <span>{user?.firstName} {user?.lastName}</span>
            </div>"""

    text = text.replace(old_div, new_div)

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/App.tsx')

import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    text = text.replace(
        "superMemberNumber: staff?.super_member_number || '',\n    canSwitchAdmin: staff ? !!staff.can_switch_admin : false,\n  });",
        "superMemberNumber: staff?.super_member_number || '',\n    canSwitchAdmin: staff ? !!staff.can_switch_admin : false,\n    avatarUrl: staff?.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${Math.random().toString(36).substring(7)}`,\n  });"
    )

    text = text.replace(
        "superMemberNumber: staff.super_member_number || '',\n        canSwitchAdmin: !!staff.can_switch_admin,\n      });",
        "superMemberNumber: staff.super_member_number || '',\n        canSwitchAdmin: !!staff.can_switch_admin,\n        avatarUrl: staff.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${staff.first_name || 'Staff'}`,\n      });"
    )

    # Now add the avatar picker UI. Let's see where to insert it.
    # We can put it right under "Edit Staff Details" / "Add New Staff" header inside the modal body.
    # Let's find:
    # <div className="flex-1 overflow-y-auto p-4 space-y-6">
    
    avatar_ui = """
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Profile Avatar</label>
            <div className="flex items-center gap-4">
              <img src={formData.avatarUrl} alt="Selected Avatar" className="w-16 h-16 rounded-full bg-brand-navy border border-white/[0.08]" />
              <div className="flex-1 overflow-x-auto whitespace-nowrap pb-2 gap-2 flex">
                {[
                  "Florence", "Clara", "Alexander", "Louis", "Marie", "Edward", "Joseph", 
                  "Rene", "Virginia", "Elizabeth", "Dorothea", "Mary", "Helen", "Sigmund", 
                  "William", "John", "Thomas", "Charles", "Paul", "Robert"
                ].map(seed => {
                  const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=c0aede,b6e3f4,d1d4f9,ffd5dc,ffdfbf`;
                  return (
                    <img 
                      key={seed} 
                      src={url} 
                      alt={seed}
                      className={`w-12 h-12 rounded-full cursor-pointer shrink-0 transition-all ${formData.avatarUrl === url ? 'ring-2 ring-brand-teal scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                      onClick={() => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                    />
                  );
                })}
              </div>
            </div>
          </div>
"""
    text = text.replace(
        '<div className="flex-1 overflow-y-auto p-4 space-y-6">',
        avatar_ui
    )

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Directory/StaffModal.tsx')

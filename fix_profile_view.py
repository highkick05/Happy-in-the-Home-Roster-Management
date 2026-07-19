import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    text = text.replace(
        "password: ''\n  });",
        "password: '',\n    avatarUrl: ''\n  });"
    )

    text = text.replace(
        "password: '' // never set password from server\n        }));",
        "password: '', // never set password from server\n          avatarUrl: data.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.firstName || 'Staff'}`\n        }));"
    )

    avatar_ui = """
        {/* Profile Avatar Selection */}
        <div className="bg-brand-navy border border-border-subtle rounded-xl p-4 md:p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-[#E6EDF3] tracking-tight">Profile Avatar</h2>
          <div className="flex items-center gap-4">
            <img src={formData.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=Staff`} alt="Selected Avatar" className="w-16 h-16 rounded-full bg-[#151515] border border-white/[0.08]" />
            <div className="flex-1 overflow-x-auto custom-scrollbar pb-2 pt-1 flex gap-2">
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
        '<form onSubmit={handleSave} className="space-y-4">',
        f'<form onSubmit={{handleSave}} className="space-y-4">\n{avatar_ui}'
    )

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Profile/ProfileView.tsx')

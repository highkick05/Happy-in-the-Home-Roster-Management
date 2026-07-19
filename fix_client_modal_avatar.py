import re

def fix_client(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    avatar_section = """            <form id="client-form" onSubmit={handleSubmit} className="space-y-6 pb-64">
              {/* Client Avatar Selection */}
              <div className="bg-[#1C2128] border border-[#30363D] rounded-xl p-4 shadow-sm space-y-3 mb-6">
                <h2 className="text-sm font-semibold text-[#E6EDF3] tracking-tight">Client Avatar</h2>
                <div className="flex items-center gap-4">
                  <img src={getAvatarUrl(formData.avatarUrl)} alt="Selected Avatar" className="w-16 h-16 rounded-full bg-[#151515] border border-white/[0.08]" />
                  <div className="flex-1 overflow-x-auto custom-scrollbar pb-2 pt-1 flex gap-2">
                    {["Child1", "Child2", "Child3", "Child4", "Child5", "Child6", "Child7", "Child8", "Child9", "Child10", "Elder1", "Elder2", "Elder3", "Elder4", "Elder5", "Elder6", "Elder7", "Elder8", "Elder9", "Elder10", "Grandpa", "Grandma", "Nana", "Papa", "Pops", "Boy1", "Girl1", "Kid1", "Kid2", "Teen1", "Senior1", "Senior2", "Senior3", "Senior4", "Senior5", "Senior6", "Senior7", "Senior8", "Senior9", "Senior10", "HappyKid", "Joyful", "Sweet", "Gentle", "Wise", "Kind", "Calm", "Peace", "Warm", "Smile"].map(seed => {
                      const url = getAvatarUrl(seed);
                      return (
                        <img 
                          key={seed} 
                          src={url} 
                          alt={seed}
                          className={`w-12 h-12 rounded-full cursor-pointer shrink-0 transition-all ${formData.avatarUrl === url ? 'ring-2 ring-brand-blue scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                          onClick={() => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
"""

    text = text.replace(
        '<form id="client-form" onSubmit={handleSubmit} className="space-y-6 pb-64">',
        avatar_section
    )

    with open(filepath, 'w') as f:
        f.write(text)

fix_client('src/components/Directory/ClientModal.tsx')

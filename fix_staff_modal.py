import re

def fix_staff(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    replacement = """            {/* Profile Avatar Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-400">Profile Avatar</label>
              <div className="flex items-center gap-4">
                <img src={getAvatarUrl(formData.avatarUrl)} alt="Selected Avatar" className="w-16 h-16 rounded-full bg-[#151515] border border-white/[0.08] object-cover" />
                <div className="flex-1 overflow-x-auto custom-scrollbar pb-2 pt-1 flex gap-2">
                  {[
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Doctor",
                    "https://api.dicebear.com/9.x/big-smile/svg?seed=Nurse",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Medic",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Healer",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Therapist",
                    "https://api.dicebear.com/9.x/big-smile/svg?seed=Surgeon",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Caregiver",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Health",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Pulse",
                    "https://api.dicebear.com/9.x/big-smile/svg?seed=Life",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Smile",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Happy",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Joy",
                    "https://api.dicebear.com/9.x/big-smile/svg?seed=Laugh",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Grin",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Beam",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Cheer",
                    "https://api.dicebear.com/9.x/big-smile/svg?seed=Delight",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Glad",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Merry",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Sunny",
                    "https://api.dicebear.com/9.x/big-smile/svg?seed=Warm",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Kind",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Gentle",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Caring",
                    "https://api.dicebear.com/9.x/big-smile/svg?seed=Support",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Help",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Aid",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Cure",
                    "https://api.dicebear.com/9.x/big-smile/svg?seed=Mend"
                  ].map(url => {
                    return (
                      <img 
                        key={url} 
                        src={url} 
                        alt="avatar option"
                        className={`w-12 h-12 rounded-full cursor-pointer shrink-0 transition-all object-cover ${formData.avatarUrl === url ? 'ring-2 ring-brand-blue scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                        onClick={() => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                      />
                    );
                  })}
                </div>
              </div>
            </div>"""

    old_section = """            {/* Profile Avatar Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-400">Profile Avatar</label>
              <div className="flex items-center gap-4">
                <img src={getAvatarUrl(formData.avatarUrl)} alt="Selected Avatar" className="w-16 h-16 rounded-full bg-[#151515] border border-white/[0.08]" />
                <div className="flex-1 overflow-x-auto custom-scrollbar pb-2 pt-1 flex gap-2">
                  {["Doctor", "Nurse", "Medic", "Healer", "Therapist", "Surgeon", "Caregiver", "Health", "Pulse", "Life", "Smile", "Happy", "Joy", "Laugh", "Grin", "Beam", "Cheer", "Delight", "Glad", "Merry", "Sunny", "Warm", "Kind", "Gentle", "Caring", "Support", "Help", "Aid", "Cure", "Mend"].map(seed => {
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
            </div>"""

    text = text.replace(old_section, replacement)

    with open(filepath, 'w') as f:
        f.write(text)

fix_staff('src/components/Directory/StaffModal.tsx')

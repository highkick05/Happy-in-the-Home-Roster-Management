import re

def fix_client(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    if "getAvatarUrl" not in text:
        text = text.replace(
            "import CustomDatePicker from '../ui/CustomDatePicker';",
            "import CustomDatePicker from '../ui/CustomDatePicker';\nimport { getAvatarUrl } from '../../utils/avatar';"
        )

    text = text.replace(
        "ndisAgreementBudget: 0,",
        "ndisAgreementBudget: 0,\n    avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${Math.random().toString(36).substring(7)}&mouth=smile,twinkle,teeth,default&accessories=prescription01,prescription02,default&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,"
    )

    text = text.replace(
        "ndisAgreementBudget: client.ndis_agreement_budget || 0,",
        "ndisAgreementBudget: client.ndis_agreement_budget || 0,\n        avatarUrl: getAvatarUrl(client.avatar_url || client.first_name || 'Client'),"
    )

    text = text.replace(
        "ndisAgreementBudget: 0,\n      });",
        "ndisAgreementBudget: 0,\n        avatarUrl: getAvatarUrl(Math.random().toString(36).substring(7)),\n      });"
    )

    avatar_section = """        {/* Client Avatar Selection */}
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
        '<form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">',
        '<form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">\n' + avatar_section
    )

    with open(filepath, 'w') as f:
        f.write(text)

fix_client('src/components/Directory/ClientModal.tsx')

import re

def generate_urls():
    seeds = [
        "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", 
        "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
        "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
        "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
        "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
        "Kenneth", "Carol", "Kevin", "Amanda", "Brian", "Melissa", "George", "Deborah",
        "Edward", "Stephanie"
    ]
    
    urls = []
    for seed in seeds:
        url = f'https://api.dicebear.com/9.x/avataaars/svg?seed={seed}&mouth=smile,twinkle&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf'
        urls.append(f'"{url}"')
    
    return ",\n                      ".join(urls)

def fix_client(filepath):
    with open(filepath, 'r') as f:
        text = f.read()
    
    urls_str = generate_urls()

    replacement = f"""              {{/* Client Avatar Selection */}}
              <div className="bg-[#1C2128] border border-[#30363D] rounded-xl p-4 shadow-sm space-y-3 mb-6">
                <h2 className="text-sm font-semibold text-[#E6EDF3] tracking-tight">Client Avatar</h2>
                <div className="flex items-center gap-4">
                  <img src={{getAvatarUrl(formData.avatarUrl)}} alt="Selected Avatar" className="w-16 h-16 rounded-full bg-[#151515] border border-white/[0.08] object-cover" />
                  <div className="flex-1 overflow-x-auto custom-scrollbar pb-2 pt-1 flex gap-2">
                    {{[
                      {urls_str}
                    ].map(url => {{
                      return (
                        <img 
                          key={{url}} 
                          src={{url}} 
                          alt="avatar option"
                          className={{`w-12 h-12 rounded-full cursor-pointer shrink-0 transition-all object-cover ${{formData.avatarUrl === url ? 'ring-2 ring-brand-blue scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}}`}}
                          onClick={{() => setFormData(prev => ({{ ...prev, avatarUrl: url }}))}}
                        />
                      );
                    }})}}
                  </div>
                </div>
              </div>"""

    old_section_regex = r"\{\/\* Client Avatar Selection \*\/\}.*?<\/div>\s*<\/div>\s*<\/div>"
    
    text = re.sub(old_section_regex, replacement, text, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(text)

fix_client('src/components/Directory/ClientModal.tsx')

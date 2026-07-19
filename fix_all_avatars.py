import re

def fix_profile(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    if "getAvatarUrl" not in text:
        text = text.replace("import CustomDatePicker from '../ui/CustomDatePicker';", "import CustomDatePicker from '../ui/CustomDatePicker';\nimport { getAvatarUrl } from '../../utils/avatar';")

    text = text.replace(
        "avatarUrl: data.avatarUrl || `https://api.multiavatar.com/${data.firstName || 'Staff'}.svg`",
        "avatarUrl: getAvatarUrl(data.avatarUrl || data.firstName || 'Staff')"
    )

    text = text.replace(
        """<img src={formData.avatarUrl || `https://api.multiavatar.com/Staff.svg`} alt="Selected Avatar" className="w-16 h-16 rounded-full bg-[#151515] border border-white/[0.08]" />""",
        """<img src={getAvatarUrl(formData.avatarUrl || 'Staff')} alt="Selected Avatar" className="w-16 h-16 rounded-full bg-[#151515] border border-white/[0.08]" />"""
    )

    text = text.replace(
        "const url = `https://api.multiavatar.com/${seed}.svg`;",
        "const url = getAvatarUrl(seed);"
    )

    with open(filepath, 'w') as f:
        f.write(text)

def fix_staff_modal(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    if "getAvatarUrl" not in text:
        text = text.replace("import CustomDatePicker from '../ui/CustomDatePicker';", "import CustomDatePicker from '../ui/CustomDatePicker';\nimport { getAvatarUrl } from '../../utils/avatar';")

    text = text.replace(
        "avatarUrl: staff?.avatar_url || `https://api.multiavatar.com/${Math.random().toString(36).substring(7)}.svg`",
        "avatarUrl: getAvatarUrl(staff?.avatar_url || Math.random().toString(36).substring(7))"
    )

    text = text.replace(
        "avatarUrl: staff.avatar_url || `https://api.multiavatar.com/${staff.first_name || 'Staff'}.svg`",
        "avatarUrl: getAvatarUrl(staff.avatar_url || staff.first_name || 'Staff')"
    )

    text = text.replace(
        "avatarUrl: `https://api.multiavatar.com/${Math.random().toString(36).substring(7)}.svg`",
        "avatarUrl: getAvatarUrl(Math.random().toString(36).substring(7))"
    )

    text = text.replace(
        "const url = `https://api.multiavatar.com/${seed}.svg`;",
        "const url = getAvatarUrl(seed);"
    )
    
    text = text.replace(
        '<img src={formData.avatarUrl} alt="Selected Avatar"',
        '<img src={getAvatarUrl(formData.avatarUrl)} alt="Selected Avatar"'
    )

    with open(filepath, 'w') as f:
        f.write(text)

def fix_app(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    if "getAvatarUrl" not in text:
        text = text.replace("import VehiclesView from './components/VehiclesView';", "import VehiclesView from './components/VehiclesView';\nimport { getAvatarUrl } from './utils/avatar';")

    text = text.replace(
        '<img src={user.avatarUrl} alt={user.firstName} className="w-5 h-5 rounded-full object-cover shrink-0 bg-[#151515] border border-brand-teal/20" />',
        '<img src={getAvatarUrl(user.avatarUrl)} alt={user.firstName} className="w-5 h-5 rounded-full object-cover shrink-0 bg-[#151515] border border-brand-teal/20" />'
    )
    with open(filepath, 'w') as f:
        f.write(text)

def fix_staff_list(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    if "getAvatarUrl" not in text:
        text = text.replace("import { Download, Plus, Search, Filter } from 'lucide-react';", "import { Download, Plus, Search, Filter } from 'lucide-react';\nimport { getAvatarUrl } from '../../utils/avatar';")

    text = text.replace(
        '<img src={s.avatar_url} alt={`${s.first_name}`} className="w-7 h-7 rounded-full border border-white/[0.08] bg-[#151515] shrink-0 object-cover" />',
        '<img src={getAvatarUrl(s.avatar_url)} alt={`${s.first_name}`} className="w-7 h-7 rounded-full border border-white/[0.08] bg-[#151515] shrink-0 object-cover" />'
    )

    with open(filepath, 'w') as f:
        f.write(text)


fix_profile('src/components/Profile/ProfileView.tsx')
fix_staff_modal('src/components/Directory/StaffModal.tsx')
fix_app('src/App.tsx')
fix_staff_list('src/components/Directory/StaffClientsView.tsx')


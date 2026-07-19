import re

def fix_dash(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    if "getAvatarUrl" not in text:
        text = text.replace(
            "import ClientRosterBuildHistory from './ClientRosterBuildHistory';",
            "import ClientRosterBuildHistory from './ClientRosterBuildHistory';\nimport { getAvatarUrl } from '../../utils/avatar';"
        )
    
    replacement = """              <div className="flex items-center space-x-4 mb-6">
                {client.avatar_url ? (
                  <img src={getAvatarUrl(client.avatar_url)} alt={`${client.first_name}`} className="w-16 h-16 rounded-full border border-white/[0.08] bg-[#151515] shrink-0 object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green flex items-center justify-center text-2xl font-semibold shrink-0">
                    {initials || '?'}
                  </div>
                )}
                <div>"""

    text = text.replace(
        """              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green flex items-center justify-center text-2xl font-semibold shrink-0">
                  {initials || '?'}
                </div>
                <div>""",
        replacement
    )

    with open(filepath, 'w') as f:
        f.write(text)

fix_dash('src/components/Directory/ClientDashboardView.tsx')

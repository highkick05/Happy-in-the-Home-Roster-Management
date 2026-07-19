import re

def fix_client(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    # If it's missing in `if (client)`, add it
    if "avatarUrl: getAvatarUrl(client.avatar_url" not in text:
        text = text.replace(
            "      });\n    } else {",
            "        avatarUrl: getAvatarUrl(client.avatar_url || client.first_name || 'Client'),\n      });\n    } else {"
        )
    
    with open(filepath, 'w') as f:
        f.write(text)

fix_client('src/components/Directory/ClientModal.tsx')

import re

def fix_client(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    text = text.replace(
        "    assessedEverydayLivingPct: 0,\n  });",
        "    assessedEverydayLivingPct: 0,\n    avatarUrl: getAvatarUrl(Math.random().toString(36).substring(7)),\n  });"
    )

    if "avatarUrl: getAvatarUrl(Math.random" not in text.split('} else {')[1]:
        text = text.replace(
            "        // ndisAgreementBudget: 0,\n      });\n    }\n  }, [client, isOpen]);",
            "        // ndisAgreementBudget: 0,\n        avatarUrl: getAvatarUrl(Math.random().toString(36).substring(7)),\n      });\n    }\n  }, [client, isOpen]);"
        )
    
    with open(filepath, 'w') as f:
        f.write(text)

fix_client('src/components/Directory/ClientModal.tsx')

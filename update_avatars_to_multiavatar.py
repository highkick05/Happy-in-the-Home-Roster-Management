import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    seeds = [
        "Doctor", "Nurse", "Medic", "Healer", "Therapist", "Surgeon", "Caregiver", "Health", "Pulse", "Life",
        "Trippy", "Neon", "Cosmic", "Quantum", "Psychedelic", "Aura", "Vibe", "Zen", "Mind", "Soul",
        "Cyborg", "Nexus", "Synth", "Bio", "Nano", "Glitch", "Echo", "Flux", "Nova", "Apex"
    ]
    
    seeds_str = "[" + ", ".join(f'"{s}"' for s in seeds) + "]"

    text = text.replace(
        "Array.from({ length: 30 }, (_, i) => `Avatar${i + 1}`)",
        seeds_str
    )

    text = text.replace(
        "https://api.dicebear.com/9.x/micah/svg?seed=${Math.random().toString(36).substring(7)}",
        "https://api.multiavatar.com/${Math.random().toString(36).substring(7)}.svg"
    )

    text = text.replace(
        "https://api.dicebear.com/9.x/micah/svg?seed=${staff.first_name || 'Staff'}",
        "https://api.multiavatar.com/${staff.first_name || 'Staff'}.svg"
    )

    text = text.replace(
        "https://api.dicebear.com/9.x/micah/svg?seed=${data.firstName || 'Staff'}",
        "https://api.multiavatar.com/${data.firstName || 'Staff'}.svg"
    )

    text = text.replace(
        "https://api.dicebear.com/9.x/micah/svg?seed=Staff",
        "https://api.multiavatar.com/Staff.svg"
    )

    text = text.replace(
        "https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=c0aede,b6e3f4,d1d4f9,ffd5dc,ffdfbf",
        "https://api.multiavatar.com/${seed}.svg"
    )

    with open(filepath, 'w') as f:
        f.write(text)

update_file('src/components/Profile/ProfileView.tsx')
update_file('src/components/Directory/StaffModal.tsx')

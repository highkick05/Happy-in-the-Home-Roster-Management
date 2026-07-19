import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    old_seeds = '["Doctor", "Nurse", "Medic", "Healer", "Therapist", "Surgeon", "Caregiver", "Health", "Pulse", "Life", "Trippy", "Neon", "Cosmic", "Quantum", "Psychedelic", "Aura", "Vibe", "Zen", "Mind", "Soul", "Cyborg", "Nexus", "Synth", "Bio", "Nano", "Glitch", "Echo", "Flux", "Nova", "Apex"]'
    new_seeds = '["Doctor", "Nurse", "Medic", "Healer", "Therapist", "Surgeon", "Caregiver", "Health", "Pulse", "Life", "Smile", "Happy", "Joy", "Laugh", "Grin", "Beam", "Cheer", "Delight", "Glad", "Merry", "Sunny", "Warm", "Kind", "Gentle", "Caring", "Support", "Help", "Aid", "Cure", "Mend"]'

    text = text.replace(old_seeds, new_seeds)

    with open(filepath, 'w') as f:
        f.write(text)

update_file('src/components/Profile/ProfileView.tsx')
update_file('src/components/Directory/StaffModal.tsx')

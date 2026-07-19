import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    # Replace the array
    old_array = """[
                "Florence", "Clara", "Alexander", "Louis", "Marie", "Edward", "Joseph", 
                "Rene", "Virginia", "Elizabeth", "Dorothea", "Mary", "Helen", "Sigmund", 
                "William", "John", "Thomas", "Charles", "Paul", "Robert"
              ]"""
    old_array_2 = """[
                    "Florence", "Clara", "Alexander", "Louis", "Marie", "Edward", "Joseph", 
                    "Rene", "Virginia", "Elizabeth", "Dorothea", "Mary", "Helen", "Sigmund", 
                    "William", "John", "Thomas", "Charles", "Paul", "Robert"
                  ]"""
    
    new_array = "Array.from({ length: 30 }, (_, i) => `Avatar${i + 1}`)"
    
    text = text.replace(old_array, new_array)
    text = text.replace(old_array_2, new_array)

    # Replace URL in the map
    text = text.replace(
        "const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=c0aede,b6e3f4,d1d4f9,ffd5dc,ffdfbf`;",
        "const url = `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=c0aede,b6e3f4,d1d4f9,ffd5dc,ffdfbf`;"
    )

    # Replace defaults
    text = text.replace("avataaars", "micah")

    with open(filepath, 'w') as f:
        f.write(text)

update_file('src/components/Profile/ProfileView.tsx')
update_file('src/components/Directory/StaffModal.tsx')

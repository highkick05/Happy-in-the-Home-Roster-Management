import re

with open("src/components/Compliance/ComplianceDashboard.tsx", "r") as f:
    code = f.read()

# Fix the incorrect closing brace from update_tab_buttons
target = """        </div>
      </div>
      )}
      {/* Manage Staff Documents Modal */}"""
replacement = """        </div>
      </div>
      )}
      {/* Manage Staff Documents Modal */}"""
code = code.replace(target, replacement)

# I should just view the end of the file and correct it manually

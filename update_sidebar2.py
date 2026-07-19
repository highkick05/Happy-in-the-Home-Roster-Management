import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

logo_target = """        <div className={`pt-4 pb-1 px-1 flex flex-col items-center justify-center text-center ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'px-1' : ''}`}>"""
logo_replacement = """        <div className={`pt-2 pb-0 px-1 flex flex-col items-center justify-center text-center ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'px-1' : ''}`}>"""

nav_target = """        <nav className="flex-1 px-3 mt-2 overflow-hidden z-10 relative flex flex-col">
          
          <div className={`text-[10px] font-bold text-zinc-500 mb-1 mt-2 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Operations</div>"""
nav_replacement = """        <nav className="flex-1 px-3 mt-0 overflow-hidden z-10 relative flex flex-col">
          
          <div className={`text-[10px] font-bold text-zinc-500 mb-1 mt-1 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Operations</div>"""

text = text.replace(logo_target, logo_replacement)
text = text.replace(nav_target, nav_replacement)

with open('src/App.tsx', 'w') as f:
    f.write(text)


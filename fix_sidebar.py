import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

getNavClasses_target = """  const getNavClasses = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center px-4 py-2.5 text-[13px] font-semibold tracking-wide transition-all duration-200 rounded-lg ${
      isActive 
        ? "bg-brand-green/10 text-white [&>svg]:text-brand-green shadow-[inset_2px_0_0_0_var(--color-brand-green)]"
        : "text-[#8B949E] hover:text-white hover:bg-white/[0.03] [&>svg]:text-[#8B949E] hover:[&>svg]:text-brand-teal"
    } ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? "justify-center !px-2" : ""}`;
  };"""

getNavClasses_replacement = """  const getNavClasses = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 rounded-lg ${
      isActive 
        ? "bg-brand-green/10 text-white [&>svg]:text-brand-green shadow-[inset_2px_0_0_0_var(--color-brand-green)]"
        : "text-[#8B949E] hover:text-white hover:bg-white/[0.03] [&>svg]:text-[#8B949E] hover:[&>svg]:text-brand-teal"
    } ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? "justify-center !px-2" : ""}`;
  };"""

text = text.replace(getNavClasses_target, getNavClasses_replacement)

logo_target = """        <div className={`p-4 pb-2 flex flex-col items-center justify-center text-center ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'px-2' : ''}`}>
          {settings?.websiteLogo ? (
            <img 
              src={settings.websiteLogo} 
              alt={settings?.businessName || "Company Logo"} 
              className={`max-h-16 w-full object-contain object-center drop-shadow-lg transition-all ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'max-h-10 opacity-80' : ''}`} 
            />
          ) : ("""

logo_replacement = """        <div className={`pt-4 pb-1 px-1 flex flex-col items-center justify-center text-center ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'px-1' : ''}`}>
          {settings?.websiteLogo ? (
            <img 
              src={settings.websiteLogo} 
              alt={settings?.businessName || "Company Logo"} 
              className={`max-h-24 w-full object-contain object-center drop-shadow-lg transition-all ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'max-h-12 opacity-80' : ''}`} 
            />
          ) : ("""

text = text.replace(logo_target, logo_replacement)

nav_target = """        <nav className="flex-1 px-4 mt-6 overflow-y-auto z-10 relative">"""
nav_replacement = """        <nav className="flex-1 px-3 mt-2 overflow-hidden z-10 relative flex flex-col">"""
text = text.replace(nav_target, nav_replacement)

with open('src/App.tsx', 'w') as f:
    f.write(text)

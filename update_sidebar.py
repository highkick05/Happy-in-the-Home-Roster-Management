import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

# Add Map to imports if not there
if 'Map ' not in text and 'Map,' not in text:
    text = text.replace('import { Calendar,', 'import { Map, Calendar,')

# Move Staff Activity
staff_activity_block = """            {user?.role === 'ADMIN' && (
              <NavLink to="/activity" className={getNavClasses} title="Staff Activity">
                <Activity className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Staff Activity' : ''}
              </NavLink>
            )}"""

# Replace in Logistics
logistics_target = f"""          <div className="space-y-0.5">
            <NavLink to="/travel-logs" className={{getNavClasses}} title="Travel Logs">
              <Car className={{`w-5 h-5 ${{isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}}`}} /> {{!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Travel Logs' : ''}}
            </NavLink>
            <NavLink to="/vehicles" className={{getNavClasses}} title="Vehicles">
              <Car className={{`w-5 h-5 ${{isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}}`}} /> {{!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Vehicles' : ''}}
            </NavLink>
{staff_activity_block}
          </div>"""

logistics_replacement = """          <div className="space-y-0.5">
            <NavLink to="/travel-logs" className={getNavClasses} title="Travel Logs">
              <Map className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Travel Logs' : ''}
            </NavLink>
            <NavLink to="/vehicles" className={getNavClasses} title="Vehicles">
              <Car className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Vehicles' : ''}
            </NavLink>
          </div>"""

# Replace in Admin & Finance
admin_finance_target = """              <div className="space-y-0.5">
                <NavLink to="/invoices" className={getNavClasses} title="Invoicing">
                  <FileText className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Invoicing' : ''}
                </NavLink>
                <NavLink to="/compliance" className={getNavClasses} title="Compliance">
                  <FileCheck className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Compliance' : ''}
                </NavLink>
              </div>"""

admin_finance_replacement = f"""              <div className="space-y-0.5">
{staff_activity_block}
                <NavLink to="/invoices" className={{getNavClasses}} title="Invoicing">
                  <FileText className={{`w-5 h-5 ${{isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}}`}} /> {{!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Invoicing' : ''}}
                </NavLink>
                <NavLink to="/compliance" className={{getNavClasses}} title="Compliance">
                  <FileCheck className={{`w-5 h-5 ${{isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}}`}} /> {{!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Compliance' : ''}}
                </NavLink>
              </div>"""

text = text.replace(logistics_target, logistics_replacement)
text = text.replace(admin_finance_target, admin_finance_replacement)

with open('src/App.tsx', 'w') as f:
    f.write(text)

print("Done")

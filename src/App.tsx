import ErrorBoundary from './components/ErrorBoundary';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import RosterCalendar from './components/Roster/RosterCalendar';
import { Map, Calendar, Users, FileText, Settings, Home, LogOut, FolderOpen, User, FileCheck , Bell, ChevronLeft, ChevronRight, Activity, Building, Heart, ClipboardEdit, RefreshCw, Bookmark, CheckSquare , Car} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import QuickLinksDrawer from './components/QuickLinksDrawer';
import Login from './components/Auth/Login';
import ForgotPasswordView from './components/Auth/ForgotPasswordView';
import ResetPasswordView from './components/Auth/ResetPasswordView';

import StaffClientsView from './components/Directory/StaffClientsView';
import ClientDashboardView from './components/Directory/ClientDashboardView';
import ClientBudgetSwitchboard from './components/Directory/ClientBudgetSwitchboard';
import ClientDocumentsView from './components/ClientDocuments/ClientDocumentsView';
import ProgressNotesView from './components/ProgressNotes/ProgressNotesView';
import SettingsView from './components/Settings/SettingsView';
import InvoicingView from './components/Invoicing/InvoicingView';
import FilesView from './components/Files/FilesView';
import StaffActivityReport from './components/Dashboard/StaffActivityReport';
import ProfileView from './components/Profile/ProfileView';
import ComplianceDashboard from './components/Compliance/ComplianceDashboard';
import ActiveShiftModal from './components/Roster/ActiveShiftModal';
import OnboardingView from './components/Onboarding/OnboardingView';
import UniversalPWAInstall from './components/UniversalPWAInstall';
import NotificationsDropdown from './components/NotificationsDropdown';
import WallboardView from './components/Kiosk/WallboardView';
import TasksView from './components/Tasks/TasksView';
import TravelLogsView from './components/TravelLogsView';
import VehiclesView from './components/VehiclesView';


function DateTimer() {
  const [now, setNow] = React.useState(new Date());
  
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  const dayName = days[now.getDay()];
  const dateStr = now.getDate() + ' ' + months[now.getMonth()];
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  return (
    <div className="flex items-center space-x-6">
      <div className="text-2xl font-sans uppercase tracking-wide text-white">{dayName}</div>
      <NotificationsDropdown />
      <div className="flex flex-col text-right">
        <div className="text-xs font-semibold uppercase text-[#8B949E] tracking-wider">{dateStr}</div>
        <div className="text-xs font-sans text-brand-teal uppercase mt-0.5 tracking-wider">{timeStr}</div>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = React.useState(() => window.innerWidth < 1024);
  const userManuallyToggled = React.useRef(false);

  const handleHardReset = async () => {
    if (window.confirm("Are you sure? This will log you out, clear all offline data, and refresh the app to ensure you have the latest updates.")) {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) await registration.unregister();
      }
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) await caches.delete(key);
      }
      window.location.reload(); 
    }
  };

  React.useEffect(() => {
    const handleResize = () => {
      if (!userManuallyToggled.current) {
        setIsDesktopSidebarCollapsed(window.innerWidth < 1024);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleDesktopSidebar = () => {
    userManuallyToggled.current = true;
    setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed);
  };
  
  const getNavClasses = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center px-3 py-1 text-xs font-semibold tracking-wide transition-all duration-200 rounded-lg ${
      isActive 
        ? "bg-brand-green/10 text-white [&>svg]:text-brand-green shadow-[inset_2px_0_0_0_var(--color-brand-green)]"
        : "text-[#8B949E] hover:text-white hover:bg-white/[0.03] [&>svg]:text-[#8B949E] hover:[&>svg]:text-brand-teal"
    } ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? "justify-center !px-2" : ""}`;
  };

  const { logout, user, settings, token, switchRole } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    const handleOnline = async () => {
      const pendingStr = localStorage.getItem('pending_shifts');
      if (!pendingStr || !token) return;
      
      try {
        const pendingShifts = JSON.parse(pendingStr);
        if (!Array.isArray(pendingShifts) || pendingShifts.length === 0) return;
        
        let allSynced = true;
        
        for (let i = 0; i < pendingShifts.length; i++) {
          const payload = pendingShifts[i];
          const shiftId = payload.shiftId;
          
          try {
            const res = await fetch(`/api/shifts/${shiftId}/complete`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
              },
              body: JSON.stringify(payload)
            });
            
            if (!res.ok) {
               console.error(`Failed to sync shift ${shiftId}`);
               throw new Error('Sync failed');
            }
            
            // Clean up old formats and individual records
            localStorage.removeItem(`shift_progress_${shiftId}`);
            localStorage.removeItem(`pending_sync_shift_${shiftId}`);
          } catch (e) {
            console.error('Offline sync loop halted for next attempt:', e);
            allSynced = false;
            // Keep the remaining shifts in the queue
            localStorage.setItem('pending_shifts', JSON.stringify(pendingShifts.slice(i)));
            break;
          }
        }
        
        if (allSynced) {
          localStorage.removeItem('pending_shifts');
        }
        
        window.dispatchEvent(new CustomEvent('offline-sync-completed'));
      } catch (e) {
        console.error('Offline sync parsing error:', e);
      }
    };

    window.addEventListener('online', handleOnline);
    
    // Attempt initial sync if online when mounted
    if (navigator.onLine) {
       handleOnline();
    }
    
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        const pendingStr = localStorage.getItem('pending_shifts');
        if (pendingStr && pendingStr !== '[]') {
          handleOnline();
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(syncInterval);
    };
  }, [token]);

  return (
    <div className="flex flex-col md:flex-row print:block h-[100dvh] print:h-auto bg-brand-bg text-[#E6EDF3] font-sans overflow-hidden print:overflow-visible print:bg-white text-black">
      {/* Mobile Topbar */}
      <div className="md:hidden print:hidden flex items-center justify-between px-3 bg-brand-navy border-b border-border-subtle z-20 shrink-0 relative h-16">
        <div className="flex items-center min-w-0 h-full">
          {settings?.websiteLogo ? (
            <img 
              src={settings.websiteLogo} 
              alt={settings?.businessName || "Company Logo"} 
              className="h-full w-auto max-w-[200px] object-contain drop-shadow-lg scale-[1.4] origin-left py-1" 
            />
          ) : (
            <h1 className="text-lg font-sans uppercase text-[#E6EDF3] truncate tracking-widest mt-1">
              {settings?.businessName || "Happy in the Home"}
            </h1>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <NotificationsDropdown />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-[#8B949E] hover:text-white transition-colors rounded-md hover:bg-white/[0.04]"
          >
            {isMobileMenuOpen ? <LogOut className="w-6 h-6 rotate-180" /> : <div className="space-y-1.5"><span className="block w-6 h-0.5 bg-current"></span><span className="block w-6 h-0.5 bg-current"></span><span className="block w-6 h-0.5 bg-current"></span></div>}
          </button>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-30 md:hidden print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 z-40 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'w-20' : 'w-56 md:w-52'} bg-brand-navy border-r border-border-subtle flex flex-col transition-all duration-300 ease-in-out shrink-0 group print:hidden`}>
        
        {/* Collapse Toggle */}
        <button 
          onClick={toggleDesktopSidebar}
          className="hidden md:flex absolute -right-3.5 top-14 bg-brand-navy border border-border-subtle w-7 h-7 rounded-full items-center justify-center text-[#8B949E] hover:text-white hover:border-brand-teal transition-all z-50 hover:bg-brand-teal/10"
        >
          {isDesktopSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`pt-1 pb-0 px-1 flex flex-col items-center justify-center text-center ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'px-1' : ''}`}>
          {settings?.websiteLogo ? (
            <img 
              src={settings.websiteLogo} 
              alt={settings?.businessName || "Company Logo"} 
              className={`max-h-28 w-full object-contain object-center drop-shadow-lg transition-all ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'max-h-12 opacity-80' : ''}`} 
            />
          ) : (
            <h1 className={`font-sans uppercase text-[#E6EDF3] tracking-widest leading-tight transition-all ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'text-xs break-words' : 'text-xl'}`}>
              {isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'HJ' : (settings?.businessName || "Happy in the Home")}
            </h1>
          )}
        </div>
        
        <nav className="flex-1 px-3 mt-0 overflow-hidden z-10 relative flex flex-col">
          
          <div className={`text-[10px] font-bold text-zinc-500/80 mb-0.5 mt-0 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Operations</div>
          <div className="space-y-0.5">
            {user?.role === 'ADMIN' && (
              <NavLink to="/tasks" className={getNavClasses} title="Tasks">
                <CheckSquare className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Tasks' : ''}
              </NavLink>
            )}
            <NavLink to="/roster" className={getNavClasses} title="Roster">
              <Calendar className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Roster' : ''}
            </NavLink>
            <NavLink to="/progress-notes" className={getNavClasses} title="Progress Notes">
              <ClipboardEdit className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Progress Notes' : ''}
            </NavLink>
          </div>

          <div className={`text-[10px] font-bold text-zinc-500/80 mb-0.5 mt-2 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Logistics</div>
          <div className="space-y-0.5">
            <NavLink to="/travel-logs" className={getNavClasses} title="Travel Logs">
              <Map className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Travel Logs' : ''}
            </NavLink>
            <NavLink to="/vehicles" className={getNavClasses} title="Vehicles">
              <Car className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Vehicles' : ''}
            </NavLink>
          </div>

          {user?.role === 'ADMIN' && (
            <>
              <div className={`text-[10px] font-bold text-zinc-500/80 mb-0.5 mt-2 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Directory</div>
              <div className="space-y-0.5">
                <NavLink to="/clients" className={getNavClasses} title="Clients">
                  <Heart className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Clients' : ''}
                </NavLink>
                <NavLink to="/staff" className={getNavClasses} title="Staff">
                  <Users className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Staff' : ''}
                </NavLink>
                <NavLink to="/providers" className={getNavClasses} title="Providers">
                  <Building className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Providers' : ''}
                </NavLink>
              </div>

              <div className={`text-[10px] font-bold text-zinc-500/80 mb-0.5 mt-2 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Admin & Finance</div>
              <div className="space-y-0.5">
            {user?.role === 'ADMIN' && (
              <NavLink to="/activity" className={getNavClasses} title="Staff Activity">
                <Activity className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Staff Activity' : ''}
              </NavLink>
            )}
                <NavLink to="/invoices" className={getNavClasses} title="Invoicing">
                  <FileText className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Invoicing' : ''}
                </NavLink>
                <NavLink to="/compliance" className={getNavClasses} title="Compliance">
                  <FileCheck className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Compliance' : ''}
                </NavLink>
              </div>
            </>
          )}

          <div className={`text-[10px] font-bold text-zinc-500/80 mb-0.5 mt-2 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Resources</div>
          <div className="space-y-0.5">
            <NavLink to="/files" className={getNavClasses} title="Files">
              <FolderOpen className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Files' : ''}
            </NavLink>
            {user?.role === 'STAFF' && (
              <NavLink to="/onboarding" className={getNavClasses} title="Onboarding Hub">
                <FileCheck className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Onboarding Hub' : ''}
              </NavLink>
            )}
          </div>

          {user?.role === 'ADMIN' && (
            <>
              <div className={`text-[10px] font-bold text-zinc-500/80 mb-0.5 mt-2 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>System</div>
              <div className="space-y-0.5">
                <NavLink to="/settings" className={getNavClasses} title="Settings">
                  <Settings className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Settings' : ''}
                </NavLink>
              </div>
            </>
          )}

          <div className="pt-4 mt-6 border-t border-border-subtle hidden">
          </div>
        </nav>

        <div className={`p-3 border-t border-border-subtle space-y-1 shrink-0 z-10 relative bg-brand-navy ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '!px-2' : ''}`}>
          {!isDesktopSidebarCollapsed || isMobileMenuOpen ? (
            <div className="mb-2 px-2 flex items-center gap-2 text-[11px] text-brand-teal font-medium tracking-wide truncate">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.firstName} className="w-5 h-5 rounded-full object-cover shrink-0 bg-[#151515] border border-brand-teal/20" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0 text-[9px] font-bold">
                  {user?.firstName?.charAt(0) || '?'}
                </div>
              )}
              <span>{user?.firstName} {user?.lastName}</span>
            </div>
          ) : null}
          {user?.canSwitchAdmin && (
            <div className="flex px-2 pb-1">
              <button 
                onClick={() => switchRole(user.role === 'ADMIN' ? 'STAFF' : 'ADMIN')}
                className="w-full flex items-center justify-center px-3 py-1 text-[11px] font-semibold tracking-wide bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 border border-brand-teal/30 rounded-md transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> 
                {!isDesktopSidebarCollapsed || isMobileMenuOpen ? (user.role === 'ADMIN' ? 'Switch to Staff' : 'Switch to Admin') : ''}
              </button>
            </div>
          )}
          <div className={isDesktopSidebarCollapsed && !isMobileMenuOpen ? "flex flex-col space-y-1" : "flex items-center space-x-1"}>
            <NavLink to="/profile" className={(props: {isActive: boolean}) => `${getNavClasses(props)} ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'w-full' : 'flex-1'}`} title="Profile">
              <User className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Profile' : ''}
            </NavLink>
            <button onClick={handleHardReset} title="Sync / Reset App Cache" className={`flex-shrink-0 flex items-center justify-center ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'h-7 w-full' : 'h-7 w-7'} bg-brand-navy hover:bg-brand-bg text-[#8B949E] hover:text-[#E6EDF3] border border-transparent hover:border-border-subtle rounded-lg transition-colors`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <button onClick={logout} className={`flex items-center px-3 py-1 text-xs font-semibold tracking-wide transition-all duration-200 rounded-lg text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/[0.03] [&>svg]:text-[#8B949E] hover:[&>svg]:text-white w-full ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? "justify-center !px-2" : ""}`} title="Sign Out">
            <LogOut className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Sign Out' : ''}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible bg-brand-bg print:bg-white relative">
        <header className="h-12 shrink-0 border-b border-border-subtle bg-brand-bg/80 text-[#E6EDF3] backdrop-blur-md flex items-center justify-end px-4 md:px-8 hidden md:flex sticky top-0 z-[100] print:hidden">
          <DateTimer />
        </header>
        <main className={`flex-1 ${location.pathname.includes('/travel-logs') || location.pathname.includes('/vehicles') || location.pathname.includes('/roster') || location.pathname.includes('/kiosk') || location.pathname.includes('/files') || location.pathname.includes('/tasks') ? 'overflow-hidden flex flex-col min-h-0' : 'overflow-auto'} print:overflow-visible ${location.pathname.includes('/files') || location.pathname.includes('/tasks') ? 'p-0' : location.pathname.includes('/roster') || location.pathname.includes('/kiosk') ? 'p-0 md:pt-4 md:pb-6 md:px-8' : 'p-4 md:pt-4 md:pb-6 md:px-8'} print:p-0 relative`}>
          {children}
        </main>
      </div>

      {/* Quick Links Floating Hover Tab */}
      {user?.role === 'ADMIN' && <QuickLinksDrawer />}
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false, staffOnly = false }: { children: React.ReactNode, adminOnly?: boolean, staffOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-black text-zinc-500">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to="/roster" replace />;
  }

  if (staffOnly && user.role !== 'STAFF') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') {
    return <Navigate to="/tasks" replace />;
  }
  return <Navigate to="/roster" replace />;
}

export default function App() {
  React.useEffect(() => {
    fetch('/api/app-manifest.json').then(r => r.json()).then(data => {
      const link = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (link && data.icons?.[0]?.src) {
        link.href = data.icons[0].src;
      }
      if (data.name) {
        document.title = data.name;
        const meta = document.querySelector("meta[name='apple-mobile-web-app-title']") as HTMLMetaElement;
        if(meta) meta.content = data.short_name || data.name;
      }
    }).catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <UniversalPWAInstall />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPasswordView />} />
            <Route path="/reset-password/:token" element={<ResetPasswordView />} />
            <Route path="/kiosk/wallboard" element={<WallboardView />} />
            <Route path="/" element={<ProtectedRoute><RootRedirect /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute adminOnly><Layout><TasksView /></Layout></ProtectedRoute>} />
            <Route path="/travel-logs" element={<ProtectedRoute><Layout><TravelLogsView /></Layout></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute><Layout><VehiclesView /></Layout></ProtectedRoute>} />
            <Route path="/roster" element={<ProtectedRoute><Layout><RosterCalendar /></Layout></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute adminOnly><Layout><StaffClientsView type="STAFF" /></Layout></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute adminOnly><Layout><StaffClientsView type="CLIENTS" /></Layout></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute adminOnly><Layout><ClientDashboardView /></Layout></ProtectedRoute>} />
            <Route path="/clients/:id/budget" element={<ProtectedRoute adminOnly><Layout><ClientBudgetSwitchboard /></Layout></ProtectedRoute>} />
            <Route path="/clients/:id/documents" element={<ProtectedRoute adminOnly><Layout><ClientDocumentsView /></Layout></ProtectedRoute>} />
            <Route path="/providers" element={<ProtectedRoute adminOnly><Layout><StaffClientsView type="PROVIDERS" /></Layout></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute adminOnly><Layout><InvoicingView /></Layout></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute adminOnly><Layout><StaffActivityReport /></Layout></ProtectedRoute>} />
            <Route path="/progress-notes" element={<ProtectedRoute><Layout><ProgressNotesView /></Layout></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute adminOnly><Layout><ComplianceDashboard /></Layout></ProtectedRoute>} />
            <Route path="/files" element={<ProtectedRoute><Layout><FilesView /></Layout></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute staffOnly><Layout><OnboardingView /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><Layout><SettingsView /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfileView /></Layout></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}


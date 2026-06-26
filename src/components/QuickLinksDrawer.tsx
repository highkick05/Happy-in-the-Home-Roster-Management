import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  ChevronLeft,
  DollarSign, 
  Receipt, 
  Sparkles, 
  Terminal, 
  PenTool, 
  Server,
  Settings,
  Plus,
  Trash2,
  X,
  Link as LinkIcon,
  Save,
  Folder,
  Mail,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface QuickLink {
  id: string;
  title: string;
  shortTitle: string;
  url: string;
  domain?: string;
  customIconUrl?: string;
  color: string;
  glowColor: string;
  iconName?: string;
  description: string;
}

const DEFAULT_LINKS: QuickLink[] = [
  {
    id: 'xero',
    title: 'Xero Accounting',
    shortTitle: 'Xero',
    url: 'https://go.xero.com/app/!S5BQ2/homepage',
    domain: 'xero.com',
    color: '#00b7e5',
    glowColor: 'rgba(0,183,229,0.25)',
    iconName: 'DollarSign',
    description: 'Ledger, invoices & payroll'
  },
  {
    id: 'hubdoc',
    title: 'Hubdoc Extraction',
    shortTitle: 'Hubdoc',
    url: 'https://app.hubdoc.com/login',
    domain: 'hubdoc.com',
    color: '#f27a24',
    glowColor: 'rgba(242,122,36,0.25)',
    iconName: 'Receipt',
    description: 'Receipts & document scans'
  },
  {
    id: 'gemini',
    title: 'Google Gemini AI',
    shortTitle: 'Gemini',
    url: 'https://gemini.google.com/app/5626c960cbeb3707',
    domain: 'gemini.google.com',
    color: '#8a5cf5',
    glowColor: 'rgba(138,92,245,0.25)',
    iconName: 'Sparkles',
    description: 'Conversational assistant'
  },
  {
    id: 'aistudio',
    title: 'Google AI Studio',
    shortTitle: 'AI Studio',
    url: 'https://aistudio.google.com/apps/87e3cdb9-264a-49c1-97bb-8bab763826d7?showAssistant=true&showCode=true',
    domain: 'aistudio.google.com',
    color: '#0ea5e9',
    glowColor: 'rgba(14,165,233,0.25)',
    iconName: 'Terminal',
    description: 'Developer workspace'
  },
  {
    id: 'docuseal',
    title: 'DocuSeal Service',
    shortTitle: 'DocuSeal',
    url: 'https://sign.happyinthehome.org/',
    domain: 'docuseal.co',
    color: '#3b82f6',
    glowColor: 'rgba(59,130,246,0.25)',
    iconName: 'PenTool',
    description: 'Electronic signatures & templates'
  },
  {
    id: 'nginx-proxy',
    title: 'Nginx Proxy Manager',
    shortTitle: 'Nginx Proxy',
    url: 'https://nginx.happyinthehome.org/',
    customIconUrl: 'https://raw.githubusercontent.com/NginxProxyManager/nginx-proxy-manager/master/frontend/src/images/logo.png',
    color: '#10b981',
    glowColor: 'rgba(16,185,129,0.25)',
    iconName: 'Server',
    description: 'Secure SSL & routing config'
  },
  {
    id: 'file-storage',
    title: 'File Storage',
    shortTitle: 'Files',
    url: 'https://files.happyinthehome.org/',
    domain: 'files.happyinthehome.org',
    color: '#fbbf24',
    glowColor: 'rgba(251,191,36,0.25)',
    iconName: 'Folder',
    description: 'File Storage'
  },
  {
    id: 'mailcow',
    title: 'Mailcow',
    shortTitle: 'Mail',
    url: 'https://mail.happyinthehome.org/',
    domain: 'mail.happyinthehome.org',
    color: '#ef4444',
    glowColor: 'rgba(239,68,68,0.25)',
    iconName: 'Mail',
    description: 'Email server'
  },
  {
    id: 'paperless-ngx',
    title: 'Paperless-ngx',
    shortTitle: 'Paperless',
    url: 'https://docs.mailboy.org/',
    domain: 'docs.mailboy.org',
    color: '#6366f1',
    glowColor: 'rgba(99,102,241,0.25)',
    iconName: 'FileText',
    description: 'Document management'
  }
];

const APP_ICON_CATALOG = [
  { name: 'Mailcow', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/mailcow.png' },
  { name: 'Paperless', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/paperless-ngx.png' },
  { name: 'FileBrowser', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/filebrowser.png' },
  { name: 'Nextcloud', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nextcloud.png' },
  { name: 'Proxmox', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/proxmox.png' },
  { name: 'Portainer', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/portainer.png' },
  { name: 'Docker', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/docker.png' },
  { name: 'TrueNAS', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/truenas.png' },
  { name: 'pfSense', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pfsense.png' },
  { name: 'Plex', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png' },
  { name: 'Jellyfin', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/jellyfin.png' },
  { name: 'Grafana', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/grafana.png' },
  { name: 'Nginx Proxy', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nginx-proxy-manager.png' },
  { name: 'Home Assistant', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/home-assistant.png' },
  { name: 'Cloudflare', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/cloudflare.png' },
  { name: 'GitHub', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/github.png' },
  { name: 'GitLab', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/gitlab.png' },
  { name: 'Bitwarden', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/bitwarden.png' },
  { name: 'Vaultwarden', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/vaultwarden.png' },
  { name: 'Uptime Kuma', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/uptime-kuma.png' },
  { name: 'AdGuard', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/adguard-home.png' },
  { name: 'Pi-hole', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pihole.png' },
  { name: 'Syncthing', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/syncthing.png' },
  { name: 'Synology', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/synology.png' },
  { name: 'Unifi', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/unifi.png' },
  { name: 'WordPress', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/wordpress.png' },
  { name: 'Google', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/google.png' },
  { name: 'Google Drive', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/google-drive.png' },
  { name: 'Gmail', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/gmail.png' },
  { name: 'Xero', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/xero.png' },
  { name: 'Microsoft', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/microsoft.png' },
  { name: 'AWS', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/aws.png' },
  { name: 'Stripe', url: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/stripe.png' },
];

const ICONS: Record<string, React.FC<any>> = {
  DollarSign, Receipt, Sparkles, Terminal, PenTool, Server, LinkIcon, Folder, Mail, FileText
};

function renderIcon(iconName?: string) {
  const Icon = iconName && ICONS[iconName] ? ICONS[iconName] : LinkIcon;
  return <Icon className="w-5 h-5" />;
}

interface BrandLogoIconProps {
  domain?: string;
  customIconUrl?: string;
  fallbackIcon: React.ReactNode;
  color: string;
  alt: string;
}

function BrandLogoIcon({ domain, customIconUrl, fallbackIcon, color, alt }: BrandLogoIconProps) {
  const [imgError, setImgError] = useState(false);
  
  // Choose highest fidelity image source
  const logoUrl = customIconUrl 
    ? customIconUrl 
    : domain 
      ? `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`
      : null;

  return (
    <div 
      className="w-12 h-12 flex items-center justify-center relative rounded-xl overflow-hidden transition-all duration-300"
      style={{ color: color }}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth < 32) {
              setImgError(true);
            }
          }}
          className="w-full h-full object-contain filter group-hover:brightness-110 group-hover:scale-110 transition-all rounded-lg"
        />
      ) : (
        <div style={{ color }} className="transform group-hover:rotate-6 transition-transform duration-300 w-7 h-7 flex items-center justify-center">
          {fallbackIcon}
        </div>
      )}
    </div>
  );
}

export default function QuickLinksDrawer() {
  const { settings, updateSettings, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  const [links, setLinks] = useState<QuickLink[]>([]);
  const [editingLinks, setEditingLinks] = useState<QuickLink[]>([]);
  const [showCatalogForLink, setShowCatalogForLink] = useState<string | null>(null);

  useEffect(() => {
    if (settings && settings.quickLinks) {
      try {
        setLinks(settings.quickLinks);
      } catch (e) {
        setLinks(DEFAULT_LINKS);
      }
    } else {
      setLinks(DEFAULT_LINKS);
    }
  }, [settings]);

  const handleMouseEnter = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isManageModalOpen) return;
    closeTimeout.current = setTimeout(() => {
      setIsOpen(false);
    }, 350);
  };

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, []);

  const openManageModal = () => {
    setEditingLinks([...links]);
    setIsManageModalOpen(true);
    setIsOpen(false);
  };

  const closeManageModal = () => {
    setIsManageModalOpen(false);
  };

  const handleSaveLinks = async () => {
    try {
      const newSettings = { ...settings, quickLinks: editingLinks };
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        updateSettings(newSettings);
        setLinks(editingLinks);
        closeManageModal();
      } else {
        alert('Failed to save settings');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving settings');
    }
  };

  const addLink = () => {
    const newLink: QuickLink = {
      id: `link-${Date.now()}`,
      title: 'New Link',
      shortTitle: 'New',
      url: 'https://',
      domain: '',
      color: '#ffffff',
      glowColor: 'rgba(255,255,255,0.25)',
      description: 'Description here'
    };
    setEditingLinks([...editingLinks, newLink]);
  };

  const updateLink = (id: string, field: keyof QuickLink, value: string) => {
    setEditingLinks(prev => prev.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: value };
        if (field === 'url') {
          try {
            const urlObj = new URL(value);
            updated.domain = urlObj.hostname;
          } catch (e) {}
        }
        return updated;
      }
      return l;
    }));
  };

  const removeLink = (id: string) => {
    setEditingLinks(prev => prev.filter(l => l.id !== id));
  };

  return (
    <>
      <div 
        id="quick-links-hover-panel"
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[200] print:hidden flex items-center justify-end h-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative flex items-center justify-end z-[201]">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* Floating Sidemenu Hover Tab Handle */
            <motion.div
              key="tab-handle"
              initial={{ x: 8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={handleToggle}
              className="flex flex-col items-center justify-center bg-brand-navy border border-r-0 border-border-subtle hover:border-brand-teal rounded-l-xl py-4 px-1.5 shadow-2xl select-none w-7 cursor-pointer hover:w-8 transition-all group"
              title="Quick tools (Hover to open)"
            >
              <Wrench className="w-3.5 h-3.5 text-brand-teal group-hover:scale-110 group-hover:rotate-45 transition-transform" />
              <div 
                className="text-[9px] font-bold text-[#8B949E] group-hover:text-white tracking-[0.16em] mt-2 select-none uppercase" 
                style={{ writingMode: 'vertical-lr' }}
              >
                Tools
              </div>
              <span className="mt-2.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green group-hover:bg-brand-teal transition-colors" />
            </motion.div>
          ) : (
            /* Hover Slide out Column Dock */
            <motion.div
              key="hover-column-dock"
              initial={{ x: '100%', opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.8 }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="bg-brand-navy/95 border border-[#30363D] shadow-2xl rounded-l-xl p-1.5 mr-0 select-none backdrop-blur-md flex flex-col items-center space-y-2 relative"
            >
              {/* Top Handle Arrow indicator */}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/[0.04] rounded-md text-[#8B949E] hover:text-[#E6EDF3] transition-colors mb-0.5 shadow-sm border border-transparent"
                title="Collapse Panel"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>

              {/* Vertical Stack of Square Brand Icon Tiles */}
              <div className="flex flex-col space-y-2">
                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    onMouseEnter={() => setActiveTooltipId(link.id)}
                    onMouseLeave={() => setActiveTooltipId(null)}
                    className="group relative flex items-center justify-center p-1 cursor-pointer bg-transparent hover:bg-[#161B22]/80 rounded-xl select-none aspect-square transition-all duration-300 transform hover:-translate-x-1"
                  >
                    {/* Radial Glow Overlay */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl" 
                      style={{
                        background: `radial-gradient(circle at center, ${link.glowColor} 0%, transparent 75%)`
                      }}
                    />

                    {/* Highly polished Brand Logo Icon without labels or borders */}
                    <BrandLogoIcon 
                      domain={link.domain}
                      customIconUrl={link.customIconUrl}
                      fallbackIcon={renderIcon(link.iconName)}
                      color={link.color}
                      alt={link.title}
                    />

                    {/* Sleek Tooltip popout towards left side */}
                    <AnimatePresence>
                      {activeTooltipId === link.id && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: -6 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-full top-1/2 -translate-y-1/2 bg-brand-bg border border-[#30363D] text-white shadow-xl rounded-xl py-2 px-3 mr-2 w-48 text-left uppercase tracking-wider select-none pointer-events-none z-[300]"
                        >
                          <p className="font-bold text-xs text-[#58A6FF] leading-snug">{link.shortTitle}</p>
                          <p className="text-[10px] text-[#8B949E] lowercase mt-0.5 font-sans leading-relaxed tracking-normal">{link.description}</p>
                          {/* Triangle Arrow */}
                          <div className="absolute left-full top-1/2 -translate-y-1/2 -ml-px w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-brand-bg" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </a>
                ))}
                  </div>
                  <div className="w-full pt-2 border-t border-[#30363D] mt-2 flex justify-center">
                    <button
                      onClick={openManageModal}
                      className="p-2 text-[#8B949E] hover:text-white hover:bg-[#161B22] rounded-lg transition-colors"
                      title="Manage Quicklinks"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isManageModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-navy border border-[#30363D] rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-[#30363D] flex justify-between items-center bg-brand-bg shrink-0 rounded-t-xl">
                <div>
                  <h3 className="text-lg font-medium text-[#E6EDF3]">Manage Quicklinks</h3>
                  <p className="text-sm text-[#8B949E]">Add, remove, or edit your quick tools.</p>
                </div>
                <button onClick={closeManageModal} className="p-2 text-[#8B949E] hover:text-white rounded-md transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                {editingLinks.map((link) => (
                  <div key={link.id} className="bg-[#161B22] border border-[#30363D] rounded-lg p-3 flex gap-3 items-start">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase">Title</label>
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) => updateLink(link.id, 'title', e.target.value)}
                          className="w-full bg-[#0D1117] border border-[#30363D] rounded-md py-1.5 px-3 text-white text-sm focus:ring-1 focus:ring-brand-teal outline-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase">Short Title</label>
                        <input
                          type="text"
                          value={link.shortTitle}
                          onChange={(e) => updateLink(link.id, 'shortTitle', e.target.value)}
                          className="w-full bg-[#0D1117] border border-[#30363D] rounded-md py-1.5 px-3 text-white text-sm focus:ring-1 focus:ring-brand-teal outline-none mt-1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase">URL</label>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                          className="w-full bg-[#0D1117] border border-[#30363D] rounded-md py-1.5 px-3 text-white text-sm focus:ring-1 focus:ring-brand-teal outline-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase">Description</label>
                        <input
                          type="text"
                          value={link.description}
                          onChange={(e) => updateLink(link.id, 'description', e.target.value)}
                          className="w-full bg-[#0D1117] border border-[#30363D] rounded-md py-1.5 px-3 text-white text-sm focus:ring-1 focus:ring-brand-teal outline-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase">Color (Hex)</label>
                        <input
                          type="text"
                          value={link.color}
                          onChange={(e) => updateLink(link.id, 'color', e.target.value)}
                          className="w-full bg-[#0D1117] border border-[#30363D] rounded-md py-1.5 px-3 text-white text-sm focus:ring-1 focus:ring-brand-teal outline-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase">Icon Name</label>
                        <select
                          value={link.iconName || 'LinkIcon'}
                          onChange={(e) => updateLink(link.id, 'iconName', e.target.value)}
                          className="w-full bg-[#0D1117] border border-[#30363D] rounded-md py-1.5 px-3 text-white text-sm focus:ring-1 focus:ring-brand-teal outline-none mt-1"
                        >
                          {Object.keys(ICONS).map(icon => (
                            <option key={icon} value={icon}>{icon}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2 relative">
                        <label className="text-xs font-semibold text-zinc-400 uppercase">Custom Icon URL</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            value={link.customIconUrl || ''}
                            onChange={(e) => updateLink(link.id, 'customIconUrl', e.target.value)}
                            className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-md py-1.5 px-3 text-white text-sm focus:ring-1 focus:ring-brand-teal outline-none"
                            placeholder="Optional: Provide an image URL (PNG/SVG)"
                          />
                          <button
                            onClick={() => setShowCatalogForLink(showCatalogForLink === link.id ? null : link.id)}
                            className="px-3 py-1.5 bg-[#161B22] border border-[#30363D] hover:bg-[#21262D] rounded-md text-sm text-[#E6EDF3] transition-colors"
                          >
                            Catalog
                          </button>
                        </div>
                        
                        {/* Icon Catalog Popup */}
                        <AnimatePresence>
                          {showCatalogForLink === link.id && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl p-3 max-h-64 overflow-y-auto custom-scrollbar"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-zinc-400">Popular App Icons</span>
                                <button onClick={() => setShowCatalogForLink(null)} className="text-zinc-500 hover:text-white">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                {APP_ICON_CATALOG.map(appIcon => (
                                  <button
                                    key={appIcon.name}
                                    onClick={() => {
                                      updateLink(link.id, 'customIconUrl', appIcon.url);
                                      setShowCatalogForLink(null);
                                    }}
                                    className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-[#30363D] transition-colors gap-1 group"
                                    title={appIcon.name}
                                  >
                                    <img src={appIcon.url} alt={appIcon.name} className="w-8 h-8 object-contain filter group-hover:brightness-110" />
                                    <span className="text-[10px] text-zinc-400 group-hover:text-white truncate w-full text-center">{appIcon.name}</span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLink(link.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors mt-6"
                      title="Remove Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={addLink}
                  className="w-full py-3 border-2 border-dashed border-[#30363D] hover:border-brand-teal text-[#8B949E] hover:text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Quicklink</span>
                </button>
              </div>

              <div className="p-4 border-t border-[#30363D] flex justify-end gap-3 shrink-0 bg-brand-bg rounded-b-xl">
                <button
                  onClick={closeManageModal}
                  className="px-4 py-2 border border-[#30363D] text-white rounded-md hover:bg-[#161B22] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLinks}
                  className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

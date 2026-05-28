import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bookmark, 
  ChevronLeft,
  DollarSign, 
  Receipt, 
  Sparkles, 
  Terminal, 
  PenTool, 
  Server,
  ExternalLink
} from 'lucide-react';

interface QuickLink {
  id: string;
  title: string;
  shortTitle: string;
  url: string;
  domain?: string;
  customIconUrl?: string;
  color: string;
  glowColor: string;
  icon: React.ReactNode;
  description: string;
}

interface BrandLogoIconProps {
  domain?: string;
  customIconUrl?: string;
  fallbackIcon: React.ReactNode;
  color: string;
  alt: string;
}

function BrandLogoIcon({ domain, customIconUrl, fallbackIcon, color, alt }: BrandLogoIconProps) {
  const [imgError, setImgError] = React.useState(false);
  
  // Choose highest fidelity image source
  const logoUrl = customIconUrl 
    ? customIconUrl 
    : domain 
      ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}`
      : null;

  return (
    <div 
      className="w-11 h-11 bg-[#0E0E10]/95 rounded-xl flex items-center justify-center p-2 border border-[#30363D] group-hover:scale-105 group-hover:border-[currentColor] transition-all duration-300 relative shadow-sm overflow-hidden"
      style={{ color: color }}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth < 12) {
              setImgError(true);
            }
          }}
          className="w-full h-full object-contain filter group-hover:brightness-110 transition-all rounded-md"
        />
      ) : (
        <div style={{ color }} className="transform group-hover:rotate-6 transition-transform duration-300">
          {fallbackIcon}
        </div>
      )}
    </div>
  );
}

export default function QuickLinksDrawer() {
  const [isOpen, setIsOpen] = React.useState(false);
  const closeTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const [activeTooltipId, setActiveTooltipId] = React.useState<string | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => {
      setIsOpen(false);
    }, 350); // Comfortable buffer to prevent accidental closes
  };

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  React.useEffect(() => {
    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, []);

  const links: QuickLink[] = [
    {
      id: 'xero',
      title: 'Xero Accounting',
      shortTitle: 'Xero',
      url: 'https://go.xero.com/app/!S5BQ2/homepage',
      domain: 'xero.com',
      color: '#00b7e5',
      glowColor: 'rgba(0,183,229,0.25)',
      icon: <DollarSign className="w-5 h-5" />,
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
      icon: <Receipt className="w-5 h-5" />,
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
      icon: <Sparkles className="w-5 h-5" />,
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
      icon: <Terminal className="w-5 h-5" />,
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
      icon: <PenTool className="w-5 h-5" />,
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
      icon: <Server className="w-5 h-5" />,
      description: 'Secure SSL & routing config'
    }
  ];

  return (
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
              title="Quick links (Hover to open)"
            >
              <Bookmark className="w-4 h-4 text-brand-teal group-hover:scale-110 transition-transform" />
              <div 
                className="text-[9px] font-bold text-[#8B949E] group-hover:text-white tracking-[0.16em] mt-2 select-none uppercase" 
                style={{ writingMode: 'vertical-lr' }}
              >
                Portals
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
              className="bg-brand-navy/95 border border-[#30363D] shadow-2xl rounded-l-2xl p-3 mr-0 select-none backdrop-blur-md flex flex-col items-center space-y-2.5 relative"
            >
              {/* Top Handle Arrow indicator */}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/[0.04] rounded-md text-[#8B949E] hover:text-[#E6EDF3] transition-colors mb-1 shadow-sm border border-transparent hover:border-border-subtle/40"
                title="Collapse Panel"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>

              {/* Vertical Stack of Square Brand Icon Tiles */}
              <div className="flex flex-col space-y-2.5">
                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    onMouseEnter={() => setActiveTooltipId(link.id)}
                    onMouseLeave={() => setActiveTooltipId(null)}
                    className="group relative flex items-center justify-center p-1.5 cursor-pointer bg-[#0E0E10]/80 hover:bg-[#161B22] border border-[#21262D] rounded-2xl select-none aspect-square transition-all duration-300 transform hover:-translate-x-1"
                  >
                    {/* Radial Glow Overlay */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" 
                      style={{
                        background: `radial-gradient(circle at center, ${link.glowColor} 0%, transparent 75%)`
                      }}
                    />

                    {/* Highly polished Brand Logo Icon without labels */}
                    <BrandLogoIcon 
                      domain={link.domain}
                      customIconUrl={link.customIconUrl}
                      fallbackIcon={link.icon}
                      color={link.color}
                      alt={link.title}
                    />

                    {/* Small External Link corner badge */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <ExternalLink className="w-2.5 h-2.5 text-[#58A6FF]/70" />
                    </div>

                    {/* Sleek Tooltip popout towards left side */}
                    <AnimatePresence>
                      {activeTooltipId === link.id && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: -6 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-full top-1/2 -translate-y-1/2 bg-brand-bg border border-[#30363D] text-white shadow-xl rounded-xl py-2 px-3 mr-2 w-48 text-left uppercase tracking-wider select-none pointer-events-none "
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

              {/* Status Indicator pulse on bottom */}
              <div className="pt-2 border-t border-border-subtle/40 flex items-center justify-center w-full">
                <span className="flex h-2 w-2 rounded-full bg-brand-green relative">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75 animate-ping" />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

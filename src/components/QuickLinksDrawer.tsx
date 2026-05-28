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
  X,
  ExternalLink
} from 'lucide-react';

interface QuickLink {
  id: string;
  title: string;
  shortTitle: string;
  url: string;
  domain: string;
  color: string;
  glowColor: string;
  icon: React.ReactNode;
  description: string;
}

function BrandLogoIcon({ domain, fallbackIcon, color, alt }: { domain: string; fallbackIcon: React.ReactNode; color: string; alt: string }) {
  const [imgError, setImgError] = React.useState(false);
  // Using high-resolution Google Favicon Service
  const logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;

  return (
    <div 
      className="w-11 h-11 bg-brand-bg/90 rounded-xl flex items-center justify-center p-2.5 border border-[#30363D] group-hover:scale-105 group-hover:border-[currentColor] transition-all duration-300 relative shadow-sm overflow-hidden"
      style={{ color: color }}
    >
      {!imgError ? (
        <img
          src={logoUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)} // If error, render fallback
          onLoad={(e) => {
            // Some fallback responses from s2 favicon are 1x1 pixels or generic. If natural width is too small, we might fallback.
            if (e.currentTarget.naturalWidth < 16) {
              setImgError(true);
            }
          }}
          className="w-full h-full object-contain filter group-hover:brightness-110 transition-all"
        />
      ) : (
        fallbackIcon
      )}
    </div>
  );
}

export default function QuickLinksDrawer() {
  const [isOpen, setIsOpen] = React.useState(false);
  const closeTimeout = React.useRef<NodeJS.Timeout | null>(null);

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
    }, 400); // 400ms comfortable buffer to prevent accidental closes
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
      glowColor: 'rgba(0,183,229,0.15)',
      icon: <DollarSign className="w-5 h-5 text-[#00b7e5]" />,
      description: 'Ledger & invoicing'
    },
    {
      id: 'hubdoc',
      title: 'Hubdoc Login',
      shortTitle: 'Hubdoc',
      url: 'https://app.hubdoc.com/login',
      domain: 'hubdoc.com',
      color: '#f27a24',
      glowColor: 'rgba(242,122,36,0.15)',
      icon: <Receipt className="w-5 h-5 text-[#f27a24]" />,
      description: 'Extract operational cost bills'
    },
    {
      id: 'gemini',
      title: 'Google Gemini AI',
      shortTitle: 'Gemini',
      url: 'https://gemini.google.com/app/5626c960cbeb3707',
      domain: 'gemini.google.com',
      color: '#8a5cf5',
      glowColor: 'rgba(138,92,245,0.15)',
      icon: <Sparkles className="w-5 h-5 text-[#8a5cf5]" />,
      description: 'Dialogue model assistant'
    },
    {
      id: 'aistudio',
      title: 'Google AI Studio',
      shortTitle: 'AI Studio',
      url: 'https://aistudio.google.com/apps/87e3cdb9-264a-49c1-97bb-8bab763826d7?showAssistant=true&showCode=true',
      domain: 'aistudio.google.com',
      color: '#0ea5e9',
      glowColor: 'rgba(14,165,233,0.15)',
      icon: <Terminal className="w-5 h-5 text-[#0ea5e9]" />,
      description: 'Model API playground'
    },
    {
      id: 'docuseal',
      title: 'DocuSeal Service',
      shortTitle: 'DocuSeal',
      url: 'https://sign.happyinthehome.org/',
      domain: 'docuseal.co',
      color: '#3b82f6',
      glowColor: 'rgba(59,130,246,0.15)',
      icon: <PenTool className="w-5 h-5 text-[#3b82f6]" />,
      description: 'Workflow document signatures'
    },
    {
      id: 'nginx-proxy',
      title: 'Nginx Proxy Manager',
      shortTitle: 'Nginx Proxy',
      url: 'https://nginx.happyinthehome.org/',
      domain: 'nginx.com',
      color: '#10b981',
      glowColor: 'rgba(16,185,129,0.15)',
      icon: <Server className="w-5 h-5 text-[#10b981]" />,
      description: 'SSL & sub-domain config'
    }
  ];

  return (
    <div 
      id="quick-links-hover-panel"
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[200] print:hidden flex items-center justify-end"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Backdrop for click outside block on mobile only */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-transparent z-[199] cursor-default"
        />
      )}

      <div className="relative flex items-center justify-end z-[201]">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* Floating Sidemenu Hover Tab Handle */
            <motion.div
              key="tab-handle"
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleToggle}
              className="flex flex-col items-center justify-center bg-brand-navy border border-r-0 border-border-subtle hover:border-brand-teal rounded-l-xl py-4 px-1.5 shadow-xl select-none w-7 cursor-pointer hover:w-8 transition-all group"
              title="Quick references (Hover to reveal)"
            >
              <Bookmark className="w-4 h-4 text-brand-teal group-hover:scale-110 transition-transform" />
              <div 
                className="text-[9px] font-bold text-[#8B949E] group-hover:text-white tracking-[0.16em] mt-2 select-none uppercase" 
                style={{ writingMode: 'vertical-lr' }}
              >
                Portals
              </div>
              <span className="mt-2 flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green group-hover:bg-brand-teal transition-colors" />
            </motion.div>
          ) : (
            /* Hover Slide out Panel */
            <motion.div
              key="hover-panel"
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="w-[330px] bg-brand-navy/95 border border-[#30363D] shadow-2xl rounded-l-2xl p-4 mr-0 select-none backdrop-blur-md relative"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle/40 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-brand-teal/10 text-brand-teal rounded-lg">
                    <Bookmark className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-white">External Portals</h3>
                    <p className="text-[10px] text-[#8B949E]">Quick links (opens in a new tab)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/[0.04] rounded-md text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grid of Square Tiles */}
              <div className="grid grid-cols-2 gap-2.5">
                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="group relative flex flex-col items-center justify-center p-3 cursor-pointer bg-[#0E0E10]/80 hover:bg-brand-navy-light/40 border border-[#21262D] rounded-xl text-center select-none aspect-square transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden"
                    style={{
                      '--hover-glow': link.glowColor
                    } as React.CSSProperties}
                  >
                    {/* Shadow / Glow Overlay */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
                      style={{
                        background: `radial-gradient(circle at center, ${link.glowColor} 0%, transparent 70%)`
                      }}
                    />

                    {/* External Link tiny marker */}
                    <ExternalLink className="absolute top-2 right-2 w-3 h-3 text-[#484F58] opacity-0 group-hover:opacity-100 group-hover:text-[#8B949E]/70 transition-all duration-200" />

                    {/* Styled Brand Logo Icon from API container */}
                    <BrandLogoIcon 
                      domain={link.domain}
                      fallbackIcon={link.icon}
                      color={link.color}
                      alt={link.title}
                    />

                    {/* Service Name */}
                    <span className="font-bold text-xs text-[#E6EDF3] group-hover:text-white tracking-wide transition-colors mt-2">
                      {link.shortTitle}
                    </span>

                    {/* Short Description */}
                    <span className="text-[9px] text-[#8B949E] mt-1 leading-normal px-1 line-clamp-2 max-w-full">
                      {link.description}
                    </span>
                  </a>
                ))}
              </div>

              {/* Drawer compact status footer */}
              <div className="flex items-center justify-between text-[9px] text-[#58A6FF]/70 mt-3 pt-2 border-t border-border-subtle/30 font-mono tracking-wider">
                <span>Happy Job Portals</span>
                <span>v2.6.4</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

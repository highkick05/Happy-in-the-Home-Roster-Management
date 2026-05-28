import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Search, 
  Globe, 
  Bookmark, 
  BookmarkCheck, 
  BookOpen, 
  ShieldAlert,
  FolderOpen
} from 'lucide-react';

interface QuickLink {
  id: string;
  title: string;
  url: string;
  category: 'Industry' | 'Portals' | 'Resources' | 'Custom';
  description?: string;
}

const PRESET_LINKS: QuickLink[] = [
  {
    id: 'ndis-portal',
    title: 'NDIS myplace Portal',
    url: 'https://www.ndis.gov.au/providers/working-ndis/myplace-provider-portal',
    category: 'Portals',
    description: 'Access provider portal for claims, service bookings, and client matches.'
  },
  {
    id: 'proda-login',
    title: 'PRODA / HPOS Login',
    url: 'https://www.servicesaustralia.gov.au/proda-provider-digital-access',
    category: 'Portals',
    description: 'Provider Digital Access verification login and Medicare HPOS access.'
  },
  {
    id: 'trilogy-care',
    title: 'Trilogy Care Login',
    url: 'https://trilogycare.com.au/',
    category: 'Portals',
    description: 'Self-managed Home Care Package administration portal.'
  },
  {
    id: 'ndis-pricing',
    title: 'NDIS Pricing Guide & Limits',
    url: 'https://www.ndis.gov.au/providers/pricing-arrangements',
    category: 'Resources',
    description: 'Check latest NDIS Support Catalogue and billing rules.'
  },
  {
    id: 'aged-care-quality',
    title: 'Aged Care Quality Standards',
    url: 'https://www.agedcarequality.gov.au/',
    category: 'Resources',
    description: 'Aged Care Quality and Safety Commission national guidelines.'
  },
  {
    id: 'ndis-quality-safeguards',
    title: 'NDIS Commission',
    url: 'https://www.ndiscommission.gov.au/',
    category: 'Industry',
    description: 'National quality and safeguard requirements and behavior support updates.'
  }
];

interface QuickLinksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickLinksDrawer({ isOpen, onClose }: QuickLinksDrawerProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [customLinks, setCustomLinks] = React.useState<QuickLink[]>(() => {
    try {
      const stored = localStorage.getItem('quick_links_custom');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newUrl, setNewUrl] = React.useState('');
  const [newCategory, setNewCategory] = React.useState<'Industry' | 'Portals' | 'Resources' | 'Custom'>('Custom');
  const [newDesc, setNewDesc] = React.useState('');

  const [activeFilter, setActiveFilter] = React.useState<string>('All');

  // Sync to local storage
  React.useEffect(() => {
    localStorage.setItem('quick_links_custom', JSON.stringify(customLinks));
  }, [customLinks]);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    // Ensure valid URL prefix
    let formattedUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newLink: QuickLink = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      url: formattedUrl,
      category: newCategory,
      description: newDesc.trim() || undefined
    };

    setCustomLinks([newLink, ...customLinks]);
    setNewTitle('');
    setNewUrl('');
    setNewCategory('Custom');
    setNewDesc('');
    setShowAddForm(false);
  };

  const handleDeleteLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete this link?')) {
      setCustomLinks(customLinks.filter(link => link.id !== id));
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Portals':
        return <FolderOpen className="w-4 h-4 text-brand-green" />;
      case 'Resources':
        return <BookOpen className="w-4 h-4 text-brand-teal" />;
      case 'Industry':
        return <ShieldAlert className="w-4 h-4 text-purple-400" />;
      default:
        return <Globe className="w-4 h-4 text-blue-400" />;
    }
  };

  const allLinks = [...PRESET_LINKS, ...customLinks];

  const filteredLinks = allLinks.filter(link => {
    const matchesSearch = 
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (link.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = activeFilter === 'All' || link.category === activeFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Portals', 'Resources', 'Industry', 'Custom'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            id="quick-links-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-[150] print:hidden"
          />

          {/* Drawer Panel */}
          <motion.div
            id="quick-links-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-brand-navy border-l border-border-subtle shadow-2xl flex flex-col z-[200] print:hidden text-[#E6EDF3]"
          >
            {/* Header */}
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-brand-teal/10 rounded-lg text-brand-teal">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-base leading-tight">Quick Reference</h2>
                  <p className="text-xs text-[#8B949E] mt-0.5">Bookmarks & industry portals</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/[0.04] rounded-lg text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Links Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Search Control */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B949E]" />
                <input
                  type="text"
                  placeholder="Search portals or resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0E0E10] border border-border-subtle rounded-lg py-2 pl-9 pr-4 text-sm placeholder-[#8B949E] text-white focus:outline-none focus:border-brand-teal transition-colors"
                />
              </div>

              {/* Category Filter Tabs */}
              <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      activeFilter === cat
                        ? 'bg-brand-teal text-white'
                        : 'bg-[#0E0E10] text-[#8B949E] hover:text-[#E6EDF3] border border-border-subtle/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Add New Custom Link Form Toggle */}
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-2.5 px-3 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/20 hover:border-brand-teal/30 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Custom Link</span>
                </button>
              ) : (
                <form onSubmit={handleAddLink} className="bg-[#0E0E10] border border-border-subtle rounded-lg p-3.5 space-y-3">
                  <div className="flex justify-between items-center pb-1.5 border-b border-border-subtle/40">
                    <span className="text-xs font-bold text-brand-teal tracking-wide uppercase">New Bookmark</span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddForm(false)}
                      className="text-[#8B949E] hover:text-[#E6EDF3] text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8B949E] tracking-wider uppercase">Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. My Organization"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-teal"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8B949E] tracking-wider uppercase">URL</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. happyinthehome.org"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-teal"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8B949E] tracking-wider uppercase">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-brand-navy border border-border-subtle rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-teal"
                    >
                      <option value="Custom">Custom</option>
                      <option value="Portals">Portal</option>
                      <option value="Resources">Resource</option>
                      <option value="Industry">Industry</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8B949E] tracking-wider uppercase">Description (Optional)</label>
                    <textarea
                      placeholder="e.g. Direct link to billing module"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 text-xs text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-brand-teal resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-brand-teal hover:bg-brand-teal-light text-white rounded-md text-xs font-semibold select-none flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Save to Quick Links</span>
                  </button>
                </form>
              )}

              {/* List of Links */}
              <div className="space-y-2.5">
                {filteredLinks.length === 0 ? (
                  <div className="text-center py-10 bg-[#0E0E10]/20 border border-border-subtle/50 rounded-xl">
                    <Globe className="w-8 h-8 text-border-subtle mx-auto mb-2.5" />
                    <p className="text-xs text-[#8B949E]">No bookmarks match your criteria.</p>
                  </div>
                ) : (
                  filteredLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="block bg-[#0E0E10]/50 hover:bg-[#161B22] border border-border-subtle/60 rounded-xl p-3.5 transition-all group hover:border-brand-teal/50 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between space-x-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-1.5 bg-brand-navy/60 rounded-lg group-hover:bg-brand-teal/10 transition-colors">
                            {getCategoryIcon(link.category)}
                          </div>
                          <div>
                            <h3 className="font-medium text-xs text-[#E6EDF3] group-hover:text-white transition-colors flex items-center">
                              {link.title}
                              <ExternalLink className="w-3 h-3 ml-1.5 text-[#8B949E] opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
                            </h3>
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-brand-navy text-[#8B949E] border border-border-subtle/30">
                              {link.category}
                            </span>
                          </div>
                        </div>

                        {/* Allow deletion of custom links */}
                        {link.id.startsWith('custom-') && (
                          <button
                            onClick={(e) => handleDeleteLink(link.id, e)}
                            className="p-1 rounded text-[#8B949E] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete custom link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      
                      {link.description && (
                        <p className="text-xs text-[#8B949E] mt-2 leading-relaxed bg-[#0E0E10]/40 p-2 rounded-md border border-border-subtle/20 group-hover:border-border-subtle/40 transition-all">
                          {link.description}
                        </p>
                      )}
                    </a>
                  ))
                )}
              </div>
            </div>

            {/* Sticky Footing Details */}
            <div className="p-4 bg-[#0E0E10] border-t border-border-subtle/80 flex items-center justify-between text-[11px] text-[#8B949E]">
              <span>Powered by Happy in the Home</span>
              <span className="font-mono text-[10px]">v2.6.4 Stable</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

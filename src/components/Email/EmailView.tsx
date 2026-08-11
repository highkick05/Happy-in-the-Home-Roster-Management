import React from 'react';
import { Mail, ExternalLink } from 'lucide-react';

export default function EmailView() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-brand-bg relative p-8">
      <div className="bg-[#1C2128]/50 backdrop-blur-md p-8 rounded-2xl border border-white/5 max-w-md w-full text-center shadow-xl">
        <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-brand-green" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Webmail Access</h2>
        <p className="text-[#8B949E] mb-8 text-sm leading-relaxed">
          For security and privacy reasons, the email portal cannot be embedded directly inside this dashboard. Please open it in a secure new tab.
        </p>

        <a 
          href="https://webmail.happyinthehome.org" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-full px-6 py-3 bg-brand-green hover:bg-[#1fb355] text-black font-semibold rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(35,211,102,0.15)] hover:shadow-[0_0_25px_rgba(35,211,102,0.25)] hover:-translate-y-0.5"
        >
          <span>Open Webmail</span>
          <ExternalLink className="w-5 h-5 ml-2" />
        </a>
      </div>
    </div>
  );
}

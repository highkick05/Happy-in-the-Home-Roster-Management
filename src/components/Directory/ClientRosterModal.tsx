import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ClientRosterTemplates from './ClientRosterTemplates';

interface ClientRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
}

export default function ClientRosterModal({ isOpen, onClose, client }: ClientRosterModalProps) {
  if (!isOpen || !client) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center p-2 sm:p-4 md:p-6" onClick={onClose}>
      <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-none h-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex border-b border-white/[0.08] shrink-0 flex-col">
          <div className="flex justify-between items-start pt-4 pb-4 px-4">
            <div className="flex flex-col shrink-0">
              <h2 className="text-xl font-semibold text-white tracking-tight">Roster Builder - {client.first_name} {client.last_name}</h2>
            </div>
            
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors mt-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 w-full bg-[#09090b] min-h-0 overflow-y-auto">
          <ClientRosterTemplates client={client} />
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

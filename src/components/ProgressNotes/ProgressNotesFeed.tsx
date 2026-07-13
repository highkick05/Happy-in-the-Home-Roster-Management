import React, { useState } from 'react';
import { Pencil, FileText, Plus, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface ProgressNote {
  source: 'SHIFT' | 'MANUAL';
  source_id: number;
  start_time: string;
  notes: string;
  staff_first_name: string;
  staff_last_name: string;
  tags?: string;
  author_id?: number;
}

interface ProgressNotesFeedProps {
  userRole: 'ADMIN' | 'STAFF' | string;
  availableClients: any[];
  selectedClientId: string;
  onClientChange: (clientId: string) => void;
  notes: ProgressNote[];
  onSubmitNote: (content: string, tags: string, clientId: string) => Promise<void>;
  onEditNote: (source: 'SHIFT' | 'MANUAL', id: number, content: string, tags?: string) => Promise<void>;
  loading?: boolean;
}

export default function ProgressNotesFeed({
  userRole,
  availableClients,
  selectedClientId,
  onClientChange,
  notes,
  onSubmitNote,
  onEditNote,
  loading
}: ProgressNotesFeedProps) {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('Activity');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingNote, setEditingNote] = useState<{source: 'SHIFT'|'MANUAL', id: number} | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  const handleSubmit = async () => {
    if (!newNoteContent.trim() || !selectedClientId) return;
    setIsSubmitting(true);
    try {
      await onSubmitNote(newNoteContent, newNoteTags, selectedClientId);
      setNewNoteContent('');
      setNewNoteTags('Activity');
    } catch (e) {
      console.error(e);
      alert('Failed to submit note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (note: ProgressNote) => {
    setEditingNote({ source: note.source, id: note.source_id });
    setEditContent(note.notes || '');
    setEditTags(note.tags || 'Activity');
  };

  const handleSaveEdit = async () => {
    if (!editingNote || !editContent.trim()) return;
    try {
      await onEditNote(editingNote.source, editingNote.id, editContent, editTags);
      setEditingNote(null);
    } catch (e) {
      console.error(e);
      alert('Failed to edit note');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Client Selector */}
      <div className="flex items-center space-x-4 bg-zinc-800 p-4 rounded-xl border border-white/[0.05]">
        <div className="flex-1 max-w-sm flex items-center space-x-3">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider shrink-0">Client</label>
          <select
            value={selectedClientId}
            onChange={(e) => onClientChange(e.target.value)}
            className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors [color-scheme:dark]"
          >
            {availableClients.length === 0 && <option value="">No clients available</option>}
            {availableClients.map(c => (
              <option key={c.id} value={c.id}>{c.first_name || c.firstName} {c.last_name || c.lastName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add New Note */}
      {selectedClientId && (
        <div className="bg-zinc-800 rounded-xl border border-white/[0.05] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between bg-zinc-800/50">
            <h3 className="font-semibold text-white">Add New Progress Note</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-black/20 rounded-lg border border-white/[0.05] overflow-hidden">
              {/* Mock Toolbar */}
              <div className="flex items-center space-x-1 p-2 border-b border-white/[0.05] bg-black/40 text-zinc-400">
                 <button className="p-1.5 hover:bg-white/10 rounded"><FileText className="w-4 h-4" /></button>
                 <button className="p-1.5 hover:bg-white/10 rounded font-bold">B</button>
                 <button className="p-1.5 hover:bg-white/10 rounded italic">I</button>
                 <button className="p-1.5 hover:bg-white/10 rounded">A̲</button>
                 
                 <div className="w-px h-4 bg-white/10 mx-2" />
                 
                 <div className="flex items-center space-x-2 text-xs ml-auto pr-2">
                   <span>Tag:</span>
                   <select 
                     value={newNoteTags}
                     onChange={(e) => setNewNoteTags(e.target.value)}
                     className="bg-transparent border-none text-white outline-none cursor-pointer"
                    >
                     <option value="Activity" className="bg-zinc-800">Activity</option>
                     <option value="Health" className="bg-zinc-800">Health</option>
                     <option value="Behavioural" className="bg-zinc-800">Behavioural</option>
                     <option value="Incident" className="bg-zinc-800">Incident</option>
                   </select>
                 </div>
              </div>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder=""
                className="w-full bg-transparent p-4 text-sm text-white resize-none h-24 outline-none"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !newNoteContent.trim()}
                className="bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 px-4 py-2 rounded-md text-[13px] font-medium hover:bg-[#3A422F] transition-colors disabled:opacity-50 flex items-center"
              >
                Submit Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-zinc-400">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-zinc-800/50 rounded-xl border border-white/[0.05]">
            No progress notes found for this client.
          </div>
        ) : (
          notes.map((note, idx) => (
            <div key={`${note.source}-${note.source_id}-${idx}`} className="bg-zinc-800 rounded-xl border border-white/[0.05] p-5">
               <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[13px] text-zinc-300">
                      Date: {formatDate(note.start_time)}
                    </div>
                    <div className="text-[13px] text-zinc-400">
                      Staff: {note.staff_first_name} {note.staff_last_name}
                      {note.source === 'SHIFT' && ' (Shift)'}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                     <button 
                       onClick={() => handleStartEdit(note)}
                       className="text-zinc-400 hover:text-white flex items-center text-[12px] transition-colors"
                     >
                       <Pencil className="w-3.5 h-3.5 mr-1.5" />
                       Edit
                     </button>
                     <button 
                       onClick={() => handleStartEdit(note)} // Re-using edit for simplicity in prototype
                       className="text-zinc-400 hover:text-white flex items-center text-[12px] transition-colors"
                     >
                       <FileText className="w-3.5 h-3.5 mr-1.5" />
                       Addendum
                     </button>
                  </div>
               </div>

               {editingNote?.source === note.source && editingNote?.id === note.source_id ? (
                 <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/[0.05]">
                    {note.source === 'MANUAL' && (
                      <div className="flex items-center space-x-2 text-xs mb-2">
                        <span className="text-zinc-400">Tag:</span>
                        <select 
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          className="bg-black/40 border border-white/[0.08] rounded px-2 py-1 text-white outline-none"
                        >
                          <option value="Activity">Activity</option>
                          <option value="Health">Health</option>
                          <option value="Behavioural">Behavioural</option>
                          <option value="Incident">Incident</option>
                        </select>
                      </div>
                    )}
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md p-3 text-[13px] text-white outline-none focus:border-brand-blue transition-colors min-h-[100px]"
                    />
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => setEditingNote(null)}
                        className="px-3 py-1.5 text-[12px] text-zinc-400 hover:text-white transition-colors flex items-center"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </button>
                      <button 
                        onClick={handleSaveEdit}
                        disabled={!editContent.trim()}
                        className="px-3 py-1.5 bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 rounded text-[12px] hover:bg-[#3A422F] transition-colors disabled:opacity-50 flex items-center"
                      >
                        <Save className="w-3.5 h-3.5 mr-1" /> Save
                      </button>
                    </div>
                 </div>
               ) : (
                 <div className="text-[14px] text-zinc-200 leading-relaxed whitespace-pre-wrap">
                   <span className="font-medium text-zinc-400">Note: </span>
                   {note.notes}
                   {note.tags && (
                     <span className="ml-2 text-[12px] text-zinc-400">
                       Tags: {note.tags}
                     </span>
                   )}
                 </div>
               )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

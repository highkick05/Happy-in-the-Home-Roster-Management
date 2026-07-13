import React, { useState, useRef } from 'react';
import { Pencil, Plus, Save, X } from 'lucide-react';
import EditorJSWrapper, { EditorJSRef } from './EditorJSWrapper';

export interface ProgressNote {
  source: 'SHIFT' | 'MANUAL';
  id: number;
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
  onSubmitNote: (content: string, tags: string, clientId: string, authorId?: string) => Promise<void>;
  onEditNote: (source: 'SHIFT' | 'MANUAL', id: number, content: string, tags?: string) => Promise<void>;
  loading?: boolean;
  staffList?: any[];
  currentUserId?: number;
}

export default function ProgressNotesFeed({
  userRole,
  availableClients,
  selectedClientId,
  onClientChange,
  notes,
  onSubmitNote,
  onEditNote,
  loading,
  staffList = [],
  currentUserId
}: ProgressNotesFeedProps) {
  const [newNoteTags, setNewNoteTags] = useState('Activity');
  const [newNoteAuthorId, setNewNoteAuthorId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef<EditorJSRef>(null);

  const [editingNote, setEditingNote] = useState<{source: 'SHIFT'|'MANUAL', id: number} | null>(null);
  const [editTags, setEditTags] = useState('');
  const editEditorRef = useRef<EditorJSRef>(null);

  const handleSubmit = async () => {
    if (!selectedClientId) return;
    setIsSubmitting(true);
    try {
      const editorData = await editorRef.current?.save();
      // Check if there's any content
      if (!editorData || editorData.blocks.length === 0) {
        setIsSubmitting(false);
        return;
      }
      
      const contentStr = JSON.stringify(editorData);
      const authorId = newNoteAuthorId ? newNoteAuthorId : currentUserId?.toString();
      await onSubmitNote(contentStr, newNoteTags, selectedClientId, authorId);
      
      editorRef.current?.clear();
      setNewNoteTags('Activity');
      setNewNoteAuthorId('');
    } catch (e) {
      console.error(e);
      alert('Failed to submit note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (note: ProgressNote) => {
    setEditingNote({ source: note.source, id: note.id });
    setEditTags(note.tags || 'Activity');
  };

  const handleSaveEdit = async () => {
    if (!editingNote) return;
    try {
      const editorData = await editEditorRef.current?.save();
      if (!editorData) return;
      const contentStr = JSON.stringify(editorData);
      await onEditNote(editingNote.source, editingNote.id, contentStr, editTags);
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
  
  // Custom renderer for read-only view
  const renderNoteContent = (contentStr: string) => {
    try {
      // First try to parse as JSON from EditorJS
      const data = JSON.parse(contentStr);
      if (data && data.blocks) {
        return (
          <div className="prose prose-invert max-w-none text-sm pointer-events-none">
            {data.blocks.map((block: any, idx: number) => {
              if (block.type === 'paragraph') return <p key={idx} dangerouslySetInnerHTML={{__html: block.data.text}} />;
              if (block.type === 'header') {
                const Tag = `h${block.data.level}` as any;
                return <Tag key={idx} dangerouslySetInnerHTML={{__html: block.data.text}} />;
              }
              if (block.type === 'list') {
                const ListTag = block.data.style === 'ordered' ? 'ol' : 'ul';
                return (
                  <ListTag key={idx}>
                    {block.data.items.map((item: string, i: number) => <li key={i} dangerouslySetInnerHTML={{__html: item}} />)}
                  </ListTag>
                );
              }
              if (block.type === 'image') {
                return (
                  <div key={idx} className="my-4">
                    <img src={block.data.file.url} alt={block.data.caption || 'Image'} className="rounded max-w-full h-auto max-h-96" />
                    {block.data.caption && <div className="text-xs text-zinc-500 mt-1" dangerouslySetInnerHTML={{__html: block.data.caption}} />}
                  </div>
                );
              }
              return <p key={idx}>{JSON.stringify(block.data)}</p>;
            })}
          </div>
        );
      }
    } catch (e) {
      // Fallback if not valid JSON (e.g. plain text old notes)
    }
    return <div className="text-[14px] text-zinc-200 leading-relaxed whitespace-pre-wrap">{contentStr}</div>;
  };

  return (
    <div className="space-y-6 w-full">
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
          <div className="px-5 py-4 border-b border-white/[0.05] flex flex-wrap items-center justify-between bg-zinc-800/50 gap-4">
            <h3 className="font-semibold text-white">Add New Progress Note</h3>
            
            <div className="flex flex-wrap items-center gap-3 ml-auto">
                {userRole === 'ADMIN' && (
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-zinc-400">Author:</span>
                    <select 
                      value={newNoteAuthorId}
                      onChange={(e) => setNewNoteAuthorId(e.target.value)}
                      className="bg-black/40 border border-white/[0.08] rounded px-2 py-1.5 text-white outline-none min-w-[120px]"
                    >
                      <option value="">(Self)</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.first_name || s.firstName} {s.last_name || s.lastName}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-zinc-400">Tag:</span>
                  <select 
                    value={newNoteTags}
                    onChange={(e) => setNewNoteTags(e.target.value)}
                    className="bg-black/40 border border-white/[0.08] rounded px-2 py-1.5 text-white outline-none"
                  >
                    <option value="Activity">Activity</option>
                    <option value="Health">Health</option>
                    <option value="Behavioural">Behavioural</option>
                    <option value="Incident">Incident</option>
                  </select>
                </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-black/20 rounded-lg border border-white/[0.05] p-4 text-white">
              <EditorJSWrapper ref={editorRef} minHeight={100} />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
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
            <div key={`${note.source}-${note.id}-${idx}`} className="bg-zinc-800 rounded-xl border border-white/[0.05] p-5">
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
                  </div>
               </div>

               {editingNote?.source === note.source && editingNote?.id === note.id ? (
                 <div className="space-y-3 bg-black/20 p-4 rounded-lg border border-white/[0.05]">
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
                    
                    <div className="bg-black/30 rounded border border-white/[0.05] p-3">
                      <EditorJSWrapper 
                        ref={editEditorRef} 
                        initialData={note.notes as any} 
                        minHeight={80} 
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-2">
                      <button 
                        onClick={() => setEditingNote(null)}
                        className="px-3 py-1.5 text-[12px] text-zinc-400 hover:text-white transition-colors flex items-center"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </button>
                      <button 
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 rounded text-[12px] hover:bg-[#3A422F] transition-colors flex items-center"
                      >
                        <Save className="w-3.5 h-3.5 mr-1" /> Save
                      </button>
                    </div>
                 </div>
               ) : (
                 <div className="mt-2">
                   {renderNoteContent(note.notes)}
                   {note.tags && (
                     <div className="mt-3 inline-block bg-white/5 px-2 py-1 rounded text-[11px] text-zinc-400 border border-white/10">
                       Tag: {note.tags}
                     </div>
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

import React, { useState, useRef, useEffect } from 'react';
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
  onDeleteNote?: (source: 'SHIFT' | 'MANUAL', id: number) => Promise<void>;
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
  onDeleteNote,
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

  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  useEffect(() => {
    setPage(1);
  }, [selectedClientId]);
  
  const paginatedNotes = notes.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(notes.length / pageSize);

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
          <div className="text-[14px] leading-[1.4] text-[#E6EDF3] block [&>p]:mb-1 [&>p]:last:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1">
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
                  <div key={idx} className="my-4 flex flex-col items-start">
                    <img src={block.data.file.url} alt="Image" className="rounded max-w-full h-auto max-h-96" />
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
    return <div className="text-[14px] text-[#E6EDF3] leading-[1.4] whitespace-pre-wrap block">{contentStr}</div>;
  };

  return (
    <div className="space-y-3 w-full">
      

      <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
        {/* Add New Note */}
        {selectedClientId && (
          <div className="bg-brand-navy rounded-xl border border-border-subtle shadow-sm flex flex-col mb-4 break-inside-avoid">
            <div className="px-3 py-2 border-b border-border-subtle bg-black/10">
              <h3 className="text-[14px] font-semibold text-white">Add New Progress Note</h3>
            </div>
            <div className="p-3">
              <div className="border border-border-subtle rounded-lg overflow-hidden bg-brand-bg text-white">
                <EditorJSWrapper 
                  ref={editorRef} 
                  minHeight={40} 
                  toolbarRight={
                    <div className="flex items-center gap-2 flex-wrap">
                      {userRole === 'ADMIN' && (
                        <div className="flex items-center space-x-2 text-[11px] w-full">
                          <span className="text-zinc-500">Author:</span>
                          <select 
                            value={newNoteAuthorId}
                            onChange={(e) => setNewNoteAuthorId(e.target.value)}
                            className="bg-black/40 border border-white/[0.08] rounded px-2 py-1 text-white outline-none flex-1"
                          >
                            <option value="" className="bg-brand-navy text-white">(Self)</option>
                            {staffList?.filter(s => s.role === 'STAFF').map(s => (
                              <option key={s.id} value={s.id} className="bg-brand-navy text-white">{s.first_name || s.firstName} {s.last_name || s.lastName}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-[11px] w-full mt-2">
                        <span className="text-zinc-500">Tag:</span>
                        <div className="bg-brand-navy border border-[#0B0C0E] rounded flex overflow-hidden flex-1">
                          {['Activity', 'Behavioural', 'Incident'].map(tag => (
                            <button
                              key={tag}
                              onClick={() => setNewNoteTags(tag)}
                              className={`flex-1 px-1 py-1 transition-colors ${newNoteTags === tag ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-brand-navy'}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  }
                />
              </div>
            </div>
            <div className="flex justify-end px-3 py-2 border-t border-border-subtle bg-black/10">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-brand-green/20 text-brand-green border border-brand-green/30 px-3 py-1.5 rounded text-[12px] font-medium hover:bg-brand-green/30 transition-colors disabled:opacity-50 flex items-center leading-none shadow-sm"
              >
                Submit Note
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="text-center py-8 text-zinc-400 w-full break-inside-avoid">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-brand-navy/80 rounded-xl border border-border-subtle w-full break-inside-avoid">
            No progress notes found for this client.
          </div>
        ) : (
          paginatedNotes.map((note, idx) => (
            <div key={`${note.source}-${note.id}-${idx}`} className="bg-brand-navy rounded-xl border border-border-subtle p-3 shadow-sm mb-4 break-inside-avoid">
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
                     {(userRole === 'ADMIN' || currentUserId === note.author_id) && (
                       <button 
                         onClick={() => onDeleteNote && onDeleteNote(note.source, note.id)}
                         className="text-red-400/80 hover:text-red-400 flex items-center text-[12px] transition-colors"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                         Delete
                       </button>
                     )}
                  </div>
               </div>

               {editingNote?.source === note.source && editingNote?.id === note.id ? (
                 <div className="space-y-3 bg-black/20 p-4 rounded-lg border border-border-subtle">
                    {note.source === 'MANUAL' && (
                      <div className="flex items-center space-x-2 text-xs mb-2">
                        <span className="text-zinc-400">Tag:</span>
                        <select 
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          className="bg-black/40 border border-white/[0.08] rounded px-2 py-1 text-white outline-none"
                        >
                          <option value="Activity" className="bg-brand-navy text-white">Activity</option>
                          <option value="Behavioural" className="bg-brand-navy text-white">Behavioural</option>
                          <option value="Incident" className="bg-brand-navy text-white">Incident</option>
                        </select>
                      </div>
                    )}
                    
                    <div className="bg-black/30 rounded border border-border-subtle p-3">
                      <EditorJSWrapper 
                        ref={editEditorRef} 
                        initialData={note.notes as any} 
                        minHeight={40} 
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
                     <div className="mt-3 block pt-2">
                       <span className="inline-block bg-brand-navy border border-border-subtle px-2 py-1 rounded text-[11px] text-zinc-400 shadow-sm">
                         Tag: {note.tags}
                       </span>
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

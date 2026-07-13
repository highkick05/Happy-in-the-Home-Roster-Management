import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import ProgressNotesFeed, { ProgressNote } from './ProgressNotesFeed';

export default function ProgressNotesView() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useLocalStorage<string>('progress_notes_client_id', searchParams.get('client') || '');
  
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setStaffList(data))
        .catch(console.error);
    }
  }, [user, token]);


  useEffect(() => {
    fetchClients(selectedClientId);
  }, [token]);

  useEffect(() => {
    if (selectedClientId) {
      fetchNotes();
      setSearchParams(prev => { prev.set('client', selectedClientId); return prev; }, { replace: true });
    } else {
      setNotes([]);
      setSearchParams(prev => { prev.delete('client'); return prev; }, { replace: true });
    }
  }, [selectedClientId, token]);

  const fetchClients = async (currentSelectedId: string) => {
    try {
      const res = await fetch('/api/progress-notes/clients', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: any, b: any) => a.first_name.localeCompare(b.first_name));
        setClients(sorted);
        if (!currentSelectedId && sorted.length > 0) {
          setSelectedClientId(sorted[0].id.toString());
        } else if (currentSelectedId && !sorted.some((c: any) => c.id.toString() === currentSelectedId)) {
          setSelectedClientId(sorted.length > 0 ? sorted[0].id.toString() : '');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotes = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      let url = `/api/progress-notes/${selectedClientId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setNotes(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNote = async (content: string, tags: string, clientId: string, authorId?: string) => {
    const res = await fetch('/api/progress-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ clientId, content, tags, authorId })
    });
    if (!res.ok) throw new Error('Failed to submit note');
    await fetchNotes();
  };

  const handleDeleteNote = async (id: number) => {
    // Only support deleting manual notes for now or check source?
    // Wait, the feed doesn't pass source to delete... let's check
    const res = await fetch(`/api/progress-notes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
       // It might be a shift note or something, but usually only manual notes are deleted this way.
       console.error("Failed to delete");
       alert("Failed to delete note. You can only delete manual notes.");
       return;
    }
    await fetchNotes();
  };

  const handleEditNote = async (source: 'SHIFT' | 'MANUAL', id: number, content: string, tags?: string) => {
    const endpoint = source === 'MANUAL' ? `/api/progress-notes/${id}` : `/api/progress-notes/shifts/${id}`;
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content, tags })
    });
    if (!res.ok) throw new Error('Failed to edit note');
    await fetchNotes();
  };

  return (
    <div className="w-full">
       <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
           <h1 className="text-lg font-bold text-white mb-0.5">Progress Notes</h1>
           <p className="text-[12px] text-zinc-400">View and manage chronological progress notes.</p>
         </div>
         <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 bg-brand-navy px-3 py-1.5 rounded-lg border border-white/[0.05]">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Client</span>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-transparent text-[13px] text-white outline-none min-w-[150px] [color-scheme:dark]"
              >
                {clients.length === 0 && <option value="">No clients available</option>}
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name || c.firstName} {c.last_name || c.lastName}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2 bg-brand-navy px-3 py-1.5 rounded-lg border border-white/[0.05]">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">From</span>
              <input type="date" className="bg-transparent text-[12px] text-zinc-400 outline-none [color-scheme:dark]" />
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider ml-2">To</span>
              <input type="date" className="bg-transparent text-[12px] text-zinc-400 outline-none [color-scheme:dark]" />
            </div>
            
            <button className="bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-[#3A422F] transition-colors flex items-center">
              Time Critical Alert
            </button>
         </div>
       </div>

       <ProgressNotesFeed
         userRole={user?.role || 'STAFF'}
         staffList={staffList}
         currentUserId={user?.id}
         availableClients={clients}
         selectedClientId={selectedClientId}
         onClientChange={setSelectedClientId}
         notes={notes}
         onSubmitNote={handleSubmitNote}
         onDeleteNote={handleDeleteNote}
         onEditNote={handleEditNote}
         loading={loading}
       />
    </div>
  );
}

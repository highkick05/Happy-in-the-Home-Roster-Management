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
       <div className="mb-2 flex items-center justify-between">
         <h1 className="text-lg font-bold text-white">Progress Notes</h1>
         <p className="text-[12px] text-zinc-400">View and manage chronological progress notes.</p>
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
         onEditNote={handleEditNote}
         loading={loading}
       />
    </div>
  );
}

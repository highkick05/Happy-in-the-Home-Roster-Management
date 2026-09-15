import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface PositionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export default function PositionsModal({ isOpen, onClose, token }: PositionsModalProps) {
  const [positions, setPositions] = useState<{id: number, name: string}[]>([]);
  const [newPosition, setNewPosition] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/positions', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setPositions(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPositions();
    }
  }, [isOpen, token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosition.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/admin/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newPosition.trim() })
      });
      setNewPosition('');
      await fetchPositions();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this position?')) return;
    try {
      await fetch(`/api/admin/positions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchPositions();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-white/[0.08] flex justify-between items-center bg-[#151515]">
          <h2 className="text-[15px] font-semibold text-white">Manage Positions</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          <form onSubmit={handleAdd} className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              placeholder="New position title..."
              className="flex-1 bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
            />
            <button 
              type="submit" 
              disabled={loading || !newPosition.trim()}
              className="flex items-center px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-md transition-colors shadow-sm shrink-0 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </button>
          </form>

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Existing Positions</h3>
            {positions.length === 0 ? (
              <div className="text-sm text-zinc-500 text-center py-4">No positions added yet.</div>
            ) : (
              positions.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2">
                  <span className="text-[13px] text-zinc-200">{p.name}</span>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

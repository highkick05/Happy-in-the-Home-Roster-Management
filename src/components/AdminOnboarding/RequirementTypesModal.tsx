import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle, Tag } from 'lucide-react';

export interface RequirementType {
  id: number;
  name: string;
  code?: string;
  description?: string;
  step_count?: number;
}

interface RequirementTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onRequirementTypesUpdated?: () => void;
}

export default function RequirementTypesModal({
  isOpen,
  onClose,
  token,
  onRequirementTypesUpdated
}: RequirementTypesModalProps) {
  const [types, setTypes] = useState<RequirementType[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/onboarding-requirement-types', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setTypes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTypes();
      setError(null);
      setEditingId(null);
    }
  }, [isOpen, token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/onboarding-requirement-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add requirement type');
      }
      setNewName('');
      setNewDescription('');
      await fetchTypes();
      if (onRequirementTypesUpdated) onRequirementTypesUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStartEdit = (t: RequirementType) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDescription(t.description || '');
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/onboarding-requirement-types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update requirement type');
      }
      setEditingId(null);
      await fetchTypes();
      if (onRequirementTypesUpdated) onRequirementTypesUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number, name: string, stepCount: number = 0) => {
    const confirmMessage = stepCount > 0
      ? `Are you sure you want to delete "${name}"? It is currently linked to ${stepCount} step(s). Those steps will remain but will have their requirement type unlinked.`
      : `Delete requirement type "${name}"?`;
    if (!confirm(confirmMessage)) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/onboarding-requirement-types/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete requirement type');
      }
      await fetchTypes();
      if (onRequirementTypesUpdated) onRequirementTypesUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex justify-between items-center bg-[#151515]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">Manage Requirement Types</h2>
              <p className="text-[11px] text-zinc-400">Tag steps with standardized types to eliminate duplicates across positions</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add New Type Form */}
          <form onSubmit={handleAdd} className="bg-black/40 border border-white/[0.08] rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                Create New Requirement Type
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. First Aid Certificate, Driver's Licence, etc."
                className="w-full bg-black/60 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-teal transition-colors placeholder-zinc-600"
              />
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description (e.g. Standard HLTAID011 requirement)..."
                className="w-full bg-black/60 border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-brand-teal transition-colors placeholder-zinc-600"
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!newName.trim()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-teal text-black text-xs font-semibold rounded-md hover:bg-brand-teal/90 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Type
              </button>
            </div>
          </form>

          {/* Existing Types List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400 uppercase tracking-wider px-1">
              <span>Standard Requirement Types ({types.length})</span>
            </div>

            {loading && types.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500">Loading requirement types...</div>
            ) : types.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500 bg-white/[0.02] border border-white/5 rounded-lg">
                No requirement types defined yet.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-lg overflow-hidden bg-black/30">
                {types.map((t) => (
                  <div key={t.id} className="p-3 hover:bg-white/[0.02] transition-colors">
                    {editingId === t.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-black border border-brand-teal/50 rounded px-2.5 py-1.5 text-[13px] text-white outline-none"
                        />
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description..."
                          className="w-full bg-black border border-white/10 rounded px-2.5 py-1 text-xs text-zinc-300 outline-none"
                        />
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(t.id)}
                            className="px-3 py-1 bg-brand-teal text-black text-xs font-semibold rounded hover:bg-brand-teal/90 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-white truncate">{t.name}</span>
                            {t.step_count !== undefined && t.step_count > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-brand-teal/15 text-brand-teal border border-brand-teal/20">
                                {t.step_count} {t.step_count === 1 ? 'step' : 'steps'}
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{t.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(t)}
                            className="p-1.5 text-zinc-400 hover:text-brand-teal hover:bg-white/5 rounded transition-colors"
                            title="Edit Type"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id, t.name, t.step_count || 0)}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            title="Delete Type"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-[#151515] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

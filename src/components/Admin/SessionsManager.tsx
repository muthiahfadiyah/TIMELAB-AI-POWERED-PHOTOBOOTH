// src/components/Admin/SessionsManager.tsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, Check, Clock, KeyRound, Power } from 'lucide-react';
import { api } from '../../lib/api';

interface AccessSession {
  id: string;
  password: string;
  durationMinutes: number;
  label: string;
  isActive: boolean;
  createdAt: string;
}

const DURATION_PRESETS = [
  { label: '30 min',  value: 30 },
  { label: '1 hour',  value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: '8 hours', value: 480 },
  { label: '1 day',   value: 1440 },
];

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes / 1440 > 1 ? 's' : ''}`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes / 60 > 1 ? 's' : ''}`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export const SessionsManager: React.FC = () => {
  const [sessions, setSessions] = useState<AccessSession[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [password, setPassword]   = useState('');
  const [duration, setDuration]   = useState(60);
  const [label, setLabel]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.sessions.list()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setPassword('');
    setDuration(60);
    setLabel('');
    setFormError(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setFormError('Password is required');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await api.sessions.create({ password: password.trim(), durationMinutes: duration, label: label.trim() });
      setSessions(prev => [created, ...prev]);
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create session');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: AccessSession) => {
    try {
      const updated = await api.sessions.update(s.id, { isActive: !s.isActive });
      setSessions(prev => prev.map(x => x.id === s.id ? updated : x));
    } catch (err: any) {
      alert(err.message || 'Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this access session? Users with this password will be locked out immediately on next check.')) return;
    try {
      await api.sessions.delete(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-3xl font-light tracking-tight">Access <em className="italic">Sessions</em></h2>
          <p className="text-white/40 text-sm mt-1">
            Create time-limited passwords for users to access the photobooth.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-[#D32A30] hover:bg-[#E05555] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(211,42,48,0.25)]"
        >
          <Plus size={15} /> Add Session
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#D32A30] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-2">
          <KeyRound size={28} className="text-white/10 mx-auto" />
          <p className="text-white/30 text-sm uppercase tracking-widest font-mono">No access sessions yet.</p>
          <p className="text-white/15 text-xs">Click "Add Session" to create a password with a time limit.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sessions.map(s => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-panel rounded-2xl p-5 flex items-center justify-between gap-4 transition-opacity ${!s.isActive ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.isActive ? 'bg-[#D32A30]/15 text-[#E05555]' : 'bg-white/5 text-white/20'}`}>
                  <KeyRound size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm tracking-wider">{s.password}</span>
                    {s.label && (
                      <span className="text-[9px] uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                        {s.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-white/30 text-[10px] uppercase tracking-widest mt-1 font-mono">
                    <Clock size={11} />
                    {formatDuration(s.durationMinutes)} access
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggleActive(s)}
                  title={s.isActive ? 'Deactivate' : 'Activate'}
                  className={`p-2.5 rounded-lg transition-all ${
                    s.isActive
                      ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                      : 'bg-white/5 text-white/20 hover:bg-white/10'
                  }`}
                >
                  <Power size={14} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  title="Delete"
                  className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Add Session Modal ── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-panel rounded-3xl p-8 space-y-6"
              style={{ background: '#0a0a10' }}
            >
              {/* Close */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <X size={15} />
              </button>

              <div className="space-y-1">
                <h3 className="text-xl font-light tracking-tight">New Access Session</h3>
                <p className="text-white/30 text-xs">Set a password and how long it grants access.</p>
              </div>

              <form onSubmit={handleAdd} className="space-y-5">
                {/* Password */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 ml-1">Password</label>
                  <input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="e.g. event2026"
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl font-mono tracking-wider focus:border-[#D32A30]/50 outline-none transition-all placeholder:text-white/10"
                  />
                </div>

                {/* Label (optional) */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 ml-1">Label (optional)</label>
                  <input
                    type="text"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder="e.g. Graduation Event"
                    className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-sm focus:border-[#D32A30]/50 outline-none transition-all placeholder:text-white/10"
                  />
                </div>

                {/* Duration presets */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 ml-1">Time Limit</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DURATION_PRESETS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setDuration(p.value)}
                        className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                          duration === p.value
                            ? 'bg-[#D32A30]/20 border-[#D32A30] text-white'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {/* Custom minutes */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min={1}
                      value={duration}
                      onChange={e => setDuration(Math.max(1, Number(e.target.value)))}
                      className="w-24 bg-white/5 border border-white/10 p-2.5 rounded-lg text-sm text-center focus:border-[#D32A30]/50 outline-none"
                    />
                    <span className="text-white/30 text-xs uppercase tracking-widest">minutes custom</span>
                  </div>
                </div>

                {formError && (
                  <p className="text-red-400 text-[10px] uppercase font-bold tracking-widest text-center">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-white text-black p-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Done'}
                  {!saving && <Check size={15} />}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

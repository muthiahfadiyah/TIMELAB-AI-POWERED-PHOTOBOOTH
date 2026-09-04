// src/components/Admin/AccessSessions.tsx

import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Power,
  X,
  Check,
  Clock,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";

type SessionStatus = "unused" | "active" | "expired" | "inactive";

interface AccessSession {
  id: string;
  password: string;
  durationMinutes: number;
  label: string;
  isActive: boolean;
  activatedAt: string | null;
  status: SessionStatus;
  remainingMs: number | null;
  createdAt: string;
}

const DURATION_PRESETS = [
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "4 hours", value: 240 },
  { label: "8 hours", value: 480 },
  { label: "1 day", value: 1440 },
];

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 1440 === 0)
    return `${minutes / 1440} day${minutes / 1440 > 1 ? "s" : ""}`;
  if (minutes % 60 === 0)
    return `${minutes / 60} hour${minutes / 60 > 1 ? "s" : ""}`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

const STATUS_STYLES: Record<SessionStatus, string> = {
  unused: "bg-white/5 text-white/40",
  active: "bg-emerald-500/10 text-emerald-400",
  expired: "bg-[#D32A30]/10 text-[#E05555]",
  inactive: "bg-white/5 text-white/30",
};

const STATUS_LABELS: Record<SessionStatus, string> = {
  unused: "Unused",
  active: "Active",
  expired: "Expired",
  inactive: "Inactive",
};

export const AccessSessions: React.FC = () => {
  const [sessions, setSessions] = useState<AccessSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [, setTick] = useState(0); // forces re-render every second for live countdowns

  // Form state
  const [password, setPassword] = useState("");
  const [duration, setDuration] = useState(60);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.sessions
      .list()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Live countdown — re-render every second, and re-sync with server every 30s
  // (so a session that just expired flips to "Expired" automatically)
  useEffect(() => {
    const tickInterval = setInterval(() => setTick((t) => t + 1), 1000);
    const syncInterval = setInterval(load, 30 * 1000);
    return () => {
      clearInterval(tickInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const resetForm = () => {
    setPassword("");
    setDuration(60);
    setLabel("");
    setFormError(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setFormError("Password is required");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await api.sessions.create({
        password: password.trim(),
        durationMinutes: duration,
        label: label.trim(),
      });
      setSessions((prev) => [created, ...prev]);
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to create session");
    } finally {
      setSaving(false);
    }
  };

  // Reactivating resets activated_at server-side — fresh timer on next use
  const handleReactivate = async (s: AccessSession) => {
    try {
      const updated = await api.sessions.update(s.id, { isActive: true });
      setSessions((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
    } catch (err: any) {
      alert(err.message || "Failed to reactivate");
    }
  };

  // Manually deactivate a currently usable session
  const handleDeactivate = async (s: AccessSession) => {
    try {
      const updated = await api.sessions.update(s.id, { isActive: false });
      setSessions((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
    } catch (err: any) {
      alert(err.message || "Failed to deactivate");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus access session ini?")) return;
    try {
      await api.sessions.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Section header — matches "Tambah Admin Baru" hierarchy */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-light tracking-tight">Access Sessions</h2>
          <p className="text-white/40 text-xs mt-1">
            Buat password dengan batas waktu akses untuk pengunjung.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm((v) => !v);
          }}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? "Batal" : "Tambah"}
        </button>
      </div>

      {/* ── Inline add form ── */}
      {showForm && (
        <div className="glass-panel p-6 rounded-3xl space-y-5">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
            Session Baru
          </p>

          <form onSubmit={handleAdd} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                  Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. event2026"
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-[#D32A30]/50 font-mono tracking-wider text-sm placeholder:text-white/10"
                />
              </div>

              {/* Label */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                  Label (opsional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Graduation Event"
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-[#D32A30]/50 text-sm placeholder:text-white/10"
                />
              </div>
            </div>

            {/* Duration presets */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                Time Limit
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setDuration(p.value)}
                    className={cn(
                      "py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                      duration === p.value
                        ? "bg-[#D32A30]/20 border-[#D32A30] text-white"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/70",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) =>
                    setDuration(Math.max(1, Number(e.target.value)))
                  }
                  className="w-20 bg-white/5 border border-white/10 p-2 rounded-lg text-xs text-center outline-none focus:border-[#D32A30]/50"
                />
                <span className="text-white/25 text-[10px] uppercase tracking-widest">
                  minutes (custom)
                </span>
              </div>
            </div>

            {formError && (
              <p className="text-red-400 text-[10px] uppercase font-bold tracking-widest">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-white text-black px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              {saving ? "Creating..." : "Done"}
              {!saving && <Check size={13} />}
            </button>
          </form>
        </div>
      )}

      {/* ── Sessions table ── */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-white/40 text-sm">Loading...</p>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <KeyRound size={22} className="text-white/10 mx-auto" />
            <p className="text-white/40 text-sm">Belum ada access session.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40">
                <th className="p-4 text-left text-[10px] uppercase tracking-widest font-bold">
                  Password
                </th>
                <th className="p-4 text-left text-[10px] uppercase tracking-widest font-bold">
                  Label
                </th>
                <th className="p-4 text-left text-[10px] uppercase tracking-widest font-bold">
                  Durasi
                </th>
                <th className="p-4 text-left text-[10px] uppercase tracking-widest font-bold">
                  Dibuat
                </th>
                <th className="p-4 text-left text-[10px] uppercase tracking-widest font-bold">
                  Status
                </th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                // Recompute live remaining time client-side for a smooth countdown
                // (server value is a snapshot from last load/sync)
                let liveRemaining: number | null = s.remainingMs;
                if (s.status === "active" && s.activatedAt) {
                  const activatedAt = new Date(s.activatedAt).getTime();
                  const expiresAt = activatedAt + s.durationMinutes * 60 * 1000;
                  liveRemaining = Math.max(0, expiresAt - Date.now());
                }
                const isExpiredLive =
                  s.status === "active" && liveRemaining === 0;
                const effectiveStatus: SessionStatus = isExpiredLive
                  ? "expired"
                  : s.status;

                const canReactivate =
                  effectiveStatus === "expired" ||
                  effectiveStatus === "inactive";

                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-b border-white/5 hover:bg-white/2",
                      (effectiveStatus === "expired" ||
                        effectiveStatus === "inactive") &&
                        "opacity-60",
                    )}
                  >
                    <td className="p-4 font-mono font-bold tracking-wider">
                      {s.password}
                    </td>
                    <td className="p-4 text-white/50">{s.label || "—"}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 text-white/60 font-mono text-xs">
                        <Clock size={12} /> {formatDuration(s.durationMinutes)}
                      </span>
                    </td>
                    <td className="p-4 text-white/40 text-xs">
                      {new Date(s.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "inline-block px-2 py-1 rounded text-[10px] uppercase font-bold w-fit",
                            STATUS_STYLES[effectiveStatus],
                          )}
                        >
                          {STATUS_LABELS[effectiveStatus]}
                        </span>
                        {effectiveStatus === "active" &&
                          liveRemaining !== null && (
                            <span className="text-[9px] text-white/30 font-mono uppercase tracking-wider">
                              {formatRemaining(liveRemaining)}
                            </span>
                          )}
                        {effectiveStatus === "expired" && (
                          <span className="text-[9px] text-white/30 uppercase tracking-wider">
                            Reactivate to allow reuse
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {canReactivate ? (
                          <button
                            onClick={() => handleReactivate(s)}
                            title="Reactivate — resets the timer"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all text-[10px] font-bold uppercase tracking-widest"
                          >
                            <RotateCcw size={13} /> Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeactivate(s)}
                            title="Deactivate"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 transition-all"
                          >
                            <Power size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-2 bg-red-400/5 hover:bg-red-400/20 rounded-lg text-red-400 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

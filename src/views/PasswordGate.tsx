// src/views/PasswordGate.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Lock, ArrowRight } from "lucide-react";
import { api, setSessionUnlocked } from "../lib/api";

interface PasswordGateProps {
  appName?: string;
  logoUrl?: string;
  onUnlock: () => void;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({
  appName = "PHOTOBOOTH",
  logoUrl,
  onUnlock,
}) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.sessions.verify(password);
      // result.expiresAt: absolute ms timestamp (number) | null (unlimited)
      // Store the password too — needed to periodically re-verify with
      // the server in case admin deletes/deactivates this session later.
      setSessionUnlocked(result.expiresAt, password);
      onUnlock();
    } catch (err: any) {
      setError(err.message || "Incorrect password");
      setShake(true);
      setPassword("");
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background mesh */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 30% 40%, rgba(211,42,48,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(65,105,225,0.06) 0%, transparent 50%)",
        }}
      />

      {/* ── Hidden tap zone — bottom-right corner → Admin Login ──
          Invisible on purpose: staff know it's there, guests won't notice it. */}
      <button
        onClick={() => navigate("/logTime/login")}
        aria-label="Admin access"
        className="absolute bottom-0 right-0 w-16 h-16 z-20 opacity-0"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm space-y-8"
      >
        {/* Logo / App name */}
        <div className="text-center space-y-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              className="h-12 w-auto object-contain mx-auto"
              alt="Logo"
            />
          ) : (
            <h1 className="text-2xl font-bold tracking-[0.1em] uppercase">
              {appName} <span className="text-[#E05555]">AI</span>
            </h1>
          )}
          <p className="text-white/30 text-[10px] uppercase tracking-[0.25em] font-mono">
            Session Required
          </p>
        </div>

        {/* Lock icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
            <Lock size={28} className="text-white/40" />
          </div>
        </div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 ml-1">
              Enter Session Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white text-center text-2xl tracking-[0.4em] focus:border-[#D32A30]/50 outline-none transition-all placeholder:text-white/10 placeholder:tracking-normal placeholder:text-sm"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-[10px] uppercase font-bold tracking-widest text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="notch notch-md btn-sharp w-full bg-white text-black p-4 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Enter Session"}
            {!loading && <ArrowRight size={15} />}
          </button>
        </motion.form>

        <p className="text-center text-[10px] text-white/15 uppercase tracking-[0.2em] font-mono">
          Contact admin if you don't have the password
        </p>
      </motion.div>
    </div>
  );
};

// src/components/Admin/AdminLogin.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken, type AppUser } from "../../lib/api";
import { motion } from "motion/react";
import { Lock, Mail, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";

interface Props {
  onLogin: (user: AppUser) => void;
}

export const AdminLogin: React.FC<Props> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.login(email, password);

      setToken(result.token);
      onLogin(result.user);
      navigate("/logTime/dashboard");
    } catch (err: any) {
      setError(err.message || "Autentikasi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] flex items-center justify-center p-6">
      <div className="mesh-bg opacity-30" />

      {/* Back to Photobooth */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/30 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} />
        Kembali ke Photobooth
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-10 rounded-[32px] w-full max-w-md relative z-10 space-y-10"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-2xl mx-auto flex items-center justify-center border border-white/10">
            <ShieldCheck className="text-[#E05555]" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-tight">
              Admin Sanctum
            </h1>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-2">
              Authorization Required
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 ml-1">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                size={16}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@photobooth.local"
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-xl focus:border-[#D32A30]/50 outline-none transition-all placeholder:text-white/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                size={16}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-xl focus:border-[#D32A30]/50 outline-none transition-all placeholder:text-white/10"
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-[10px] uppercase font-bold tracking-widest text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black p-5 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Memproses..." : "MASUK PANEL ADMIN"}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="text-center text-[10px] text-white/20 uppercase tracking-[0.2em] font-mono">
          Local SQLite Authentication
        </p>
      </motion.div>
    </div>
  );
};

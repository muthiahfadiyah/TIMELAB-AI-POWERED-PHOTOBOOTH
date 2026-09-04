// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import {
  api,
  getToken,
  getStoredUser,
  storeUser,
  clearToken,
  isSessionUnlocked,
  clearSessionUnlock,
  getStoredSessionPassword,
  type AppUser,
} from "./lib/api";
import Photobooth from "./views/Photobooth";
import { PasswordGate } from "./views/PasswordGate";
import { ShareView } from "./views/ShareView";
import { AdminLogin } from "./components/Admin/AdminLogin";
import { AdminPanel } from "./components/Admin/AdminPanel";
import { useGlobalClickSound } from "./lib/sound";

const ProtectedRoute = ({
  user,
  children,
}: {
  user: AppUser | null | undefined;
  children: React.ReactNode;
}) => {
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#020205] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#D32A30] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/logTime/login" />;
  return <>{children}</>;
};

// How often to re-check with the server that the access session
// is still active (admin may have deleted/deactivated it).
const SERVER_RECHECK_INTERVAL = 15 * 1000;

// ── Gated photobooth — shows PasswordGate first if not unlocked,
//    re-checks with the server periodically, and auto re-locks when
//    the timed session expires OR is removed by the admin ─────────────────
function GatedPhotobooth() {
  useGlobalClickSound();
  const [unlocked, setUnlocked] = useState(isSessionUnlocked());
  const [settings, setSettings] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.settings
      .get()
      .then((s) => setSettings(s))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleLock = () => {
    clearSessionUnlock();
    setUnlocked(false);
  };

  // Local expiry check — runs every second for the countdown to feel live
  useEffect(() => {
    if (!unlocked) return;
    const interval = setInterval(() => {
      if (!isSessionUnlocked()) handleLock();
    }, 1000);
    return () => clearInterval(interval);
  }, [unlocked]);

  // Server re-check — confirms the session wasn't deleted/deactivated
  // by the admin while the user is inside the photobooth
  useEffect(() => {
    if (!unlocked) return;

    const password = getStoredSessionPassword();
    if (!password) return; // nothing to re-verify (legacy/no-password case)

    const interval = setInterval(async () => {
      try {
        await api.sessions.verify(password);
        // still valid — do nothing (don't reset expiry, just confirms it's alive)
      } catch {
        // session was deleted/deactivated or password changed
        handleLock();
      }
    }, SERVER_RECHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [unlocked]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#020205] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#D32A30] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <PasswordGate
        appName={settings?.appName}
        logoUrl={settings?.logoUrl}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  return <Photobooth onLock={handleLock} />;
}

export default function App() {
  const [user, setUser] = useState<AppUser | null | undefined>(undefined);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const cached = getStoredUser();
    if (cached) {
      setUser(cached);
    }
    api.auth
      .me()
      .then(({ user: u }) => {
        setUser(u);
        storeUser(u);
      })
      .catch(() => {
        clearToken();
        setUser(null);
      });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Photobooth — gated behind session password + time limit.
            font-gff is scoped to these user-facing routes only — it must
            never apply to /logTime. */}
        <Route
          path="/"
          element={
            <div className="font-gff">
              <GatedPhotobooth />
            </div>
          }
        />

        <Route
          path="/share/:photoId"
          element={
            <div className="font-gff">
              <ShareView />
            </div>
          }
        />
        <Route
          path="/logTime/login"
          element={
            <AdminLogin
              onLogin={(u) => {
                setUser(u);
                storeUser(u);
              }}
            />
          }
        />
        <Route
          path="/logTime/:section"
          element={
            <ProtectedRoute user={user}>
              <AdminPanel
                onLogout={() => {
                  clearToken();
                  setUser(null);
                }}
              />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

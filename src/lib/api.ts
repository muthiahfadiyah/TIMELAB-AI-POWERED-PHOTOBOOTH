// src/lib/api.ts

const BASE = '/api';

export function getToken(): string | null {
  return sessionStorage.getItem('pb_token');
}

export function setToken(token: string) {
  sessionStorage.setItem('pb_token', token);
}

export function clearToken() {
  sessionStorage.removeItem('pb_token');
  sessionStorage.removeItem('pb_user');
}

export function getStoredUser(): AppUser | null {
  try {
    const raw = sessionStorage.getItem('pb_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: AppUser) {
  sessionStorage.setItem('pb_user', JSON.stringify(user));
}

// ── Session gate helpers ───────────────────────────────────────────────────
// pb_unlocked:       'true' once verified
// pb_unlock_expiry:  ABSOLUTE timestamp (ms since epoch) when the unlock
//                     expires, or 'null' for unlimited. This is the
//                     server-computed `expiresAt` — NOT a locally-derived
//                     "now + duration" value, so re-entering the same
//                     password after logout reflects the time already used.
// pb_session_pw:     the password used to unlock — kept so we can re-verify
//                     with the server periodically (in case admin deletes/
//                     deactivates the session while the user is inside)

export function isSessionUnlocked(): boolean {
  if (sessionStorage.getItem('pb_unlocked') !== 'true') return false;

  const expiryRaw = sessionStorage.getItem('pb_unlock_expiry');
  if (!expiryRaw || expiryRaw === 'null') return true; // unlimited

  const expiry = Number(expiryRaw);
  if (Date.now() >= expiry) {
    clearSessionUnlock();
    return false;
  }
  return true;
}

// expiresAt: absolute ms timestamp from the server, or null for unlimited
export function setSessionUnlocked(expiresAt: number | null, password: string) {
  sessionStorage.setItem('pb_unlocked', 'true');
  sessionStorage.setItem('pb_session_pw', password);
  sessionStorage.setItem('pb_unlock_expiry', expiresAt === null ? 'null' : String(expiresAt));
}

export function clearSessionUnlock() {
  sessionStorage.removeItem('pb_unlocked');
  sessionStorage.removeItem('pb_unlock_expiry');
  sessionStorage.removeItem('pb_session_pw');
}

export function getStoredSessionPassword(): string | null {
  return sessionStorage.getItem('pb_session_pw');
}

// Returns ms remaining, or null if unlimited / not unlocked
export function getSessionTimeRemaining(): number | null {
  const expiryRaw = sessionStorage.getItem('pb_unlock_expiry');
  if (!expiryRaw || expiryRaw === 'null') return null;
  const expiry = Number(expiryRaw);
  return Math.max(0, expiry - Date.now());
}

export interface AppUser {
  id: string;
  email: string;
  role: string;
  displayName?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Kiosk-only endpoints (generate, photo upload) require proof the caller
  // already passed the PasswordGate — send it whenever we have it.
  const sessionPassword = getStoredSessionPassword();
  if (sessionPassword) headers['X-Session-Password'] = sessionPassword;
  if (options?.headers) Object.assign(headers, options.headers);

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request gagal' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: AppUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    register: (email: string, password: string) =>
      request<{ token: string; user: AppUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    me: () => request<{ user: AppUser }>('/auth/me'),
  },

  settings: {
    get: () => request<any>('/settings'),
    update: (data: any) =>
      request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // ── Access sessions (password + time limit) ───────────────────────────────
  sessions: {
    list: () => request<any[]>('/sessions'),
    create: (data: { password: string; durationMinutes: number; label?: string }) =>
      request<any>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/sessions/${id}`, { method: 'DELETE' }),
    // Public — no auth required
    verify: (password: string) =>
      request<{ success: boolean; expiresAt: number | null; durationMinutes?: number; sessionId?: string; label?: string; noPassword?: boolean }>(
        '/sessions/verify',
        { method: 'POST', body: JSON.stringify({ password }) }
      ),
  },

  styles: {
    list: () => request<any[]>('/styles'),
    create: (data: any) =>
      request<any>('/styles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/styles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/styles/${id}`, { method: 'DELETE' }),
  },

  photos: {
    create: (image: string, originalImage?: string) =>
      request<{ id: string }>('/photos', { method: 'POST', body: JSON.stringify({ image, originalImage }) }),
    get: (id: string) =>
      request<{ id: string; image: string; originalImage: string | null; createdAt: string }>(`/photos/${id}`),
    list: (page = 1, limit = 20) =>
      request<{ photos: { id: string; createdAt: string }[]; total: number; page: number; totalPages: number }>(`/photos?page=${page}&limit=${limit}`),
    delete: (id: string) =>
      request<any>(`/photos/${id}`, { method: 'DELETE' }),
    deleteBulk: (ids: string[]) =>
      request<{ deleted: number }>('/photos/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
  },

  users: {
    list: () => request<any[]>('/users'),
    delete: (id: string) => request<any>(`/users/${id}`, { method: 'DELETE' }),
  },

  tokens: {
    stats: () => request<any>('/tokens/stats'),
  },

  generate: {
    image: (data: {
      photoBase64: string;
      stylePrompt: string;
      assetBase64?: string | null;
      gender: 'male' | 'female';
      isHijab: boolean;
      ageGroup?: 'child' | 'teen' | 'adult' | null;
      preserveIdentity?: boolean;
    }) => request<{ imageBase64: string }>('/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
};

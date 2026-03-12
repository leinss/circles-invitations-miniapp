/**
 * API client for the invitations backend.
 * Ported from circles-invitations-at-scale-backend/ui/src/lib/api.ts
 * Key changes: absolute URLs, sessionStorage JWT, no React/wagmi deps.
 */
import { config } from './config.js';
import { getToken, clearAuth } from './auth.js';

async function fetchApi<T>(
  url: string,
  options?: RequestInit & { skipSessionExpiry?: boolean },
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));

    if (response.status === 401 && !options?.skipSessionExpiry) {
      clearAuth();
      throw new Error('Session expired');
    }

    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// --- Referrals ---

export interface Referral {
  id: string;
  privateKey: string;
  status: 'pending' | 'stale' | 'confirmed' | 'claimed';
  accountAddress?: string;
  createdAt: string;
  pendingAt?: string;
  staleAt?: string | null;
  confirmedAt: string | null;
  claimedAt: string | null;
  sessions?: Array<{ id: string; slug: string; label: string }>;
}

export interface ReferralsListResponse {
  referrals: Referral[];
  count: number;
  total: number;
  limit: number;
  offset: number;
}

export const referralsApi = {
  list: (inviter?: string, opts?: { status?: string; limit?: number; offset?: number; inSession?: boolean }) => {
    const params = new URLSearchParams();
    if (inviter) params.set('inviter', inviter);
    if (opts?.status) params.set('status', opts.status);
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    if (opts?.offset != null) params.set('offset', String(opts.offset));
    if (opts?.inSession !== undefined) params.set('inSession', String(opts.inSession));
    const qs = params.toString();
    return fetchApi<ReferralsListResponse>(`${config.referralsApiBase}/my-referrals${qs ? `?${qs}` : ''}`);
  },

  create: (privateKey: string, inviter: string) =>
    fetchApi<{ success: boolean }>(`${config.referralsApiBase}/store`, {
      method: 'POST',
      body: JSON.stringify({ privateKey, inviter }),
    }),

  createBatch: (invitations: Array<{ privateKey: string; inviter: string }>) =>
    fetchApi<{ success: boolean; stored: number; failed: number; errors?: Array<{ index: number; reason: string }> }>(
      `${config.referralsApiBase}/store-batch`,
      {
        method: 'POST',
        body: JSON.stringify({ invitations }),
      },
    ),

  balance: (address: string) =>
    fetchApi<{ address: string; balance: string; balanceFormatted: string }>(
      `${config.referralsApiBase}/balance?address=${encodeURIComponent(address)}`,
    ),
};

// --- Distribution Sessions ---

export interface Session {
  id: string;
  slug: string;
  inviterAddress: string;
  label: string | null;
  expiresAt: string | null;
  paused: boolean;
  queuedCount: number;
  dispatchedCount: number;
  claimedCount: number;
  distributionUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionsListResponse {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionKey {
  id: string;
  privateKey: string;
  signerAddress: string;
  accountAddress: string;
  status: 'queued' | 'dispatched' | 'claimed';
  dispatchedAt: string | null;
  claimedAt: string | null;
  addedAt: string;
}

export interface SessionKeysResponse {
  keys: SessionKey[];
  total: number;
  queuedCount: number;
  dispatchedCount: number;
  claimedCount: number;
  limit: number;
  offset: number;
}

export const sessionsApi = {
  list: (inviter: string, opts?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams({ inviter });
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    if (opts?.offset != null) params.set('offset', String(opts.offset));
    return fetchApi<SessionsListResponse>(`${config.referralsApiBase}/distributions/sessions?${params}`);
  },

  get: (id: string) =>
    fetchApi<Session>(`${config.referralsApiBase}/distributions/sessions/${id}`),

  create: (data: { inviterAddress: string; label?: string; expiresAt?: string }) =>
    fetchApi<Session>(`${config.referralsApiBase}/distributions/sessions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { label?: string; expiresAt?: string | null; paused?: boolean }) =>
    fetchApi<Session>(`${config.referralsApiBase}/distributions/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`${config.referralsApiBase}/distributions/sessions/${id}`, {
      method: 'DELETE',
    }),

  addKeys: (id: string, keys: string[]) =>
    fetchApi<{ added: number; skipped: number; claimed: number; errors: Array<{ index: number; reason: string }> }>(
      `${config.referralsApiBase}/distributions/sessions/${id}/keys`,
      {
        method: 'POST',
        body: JSON.stringify({ keys }),
      },
    ),

  listKeys: (id: string, opts?: { status?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (opts?.status) params.set('status', opts.status);
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    if (opts?.offset != null) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return fetchApi<SessionKeysResponse>(
      `${config.referralsApiBase}/distributions/sessions/${id}/keys${qs ? `?${qs}` : ''}`,
    );
  },

  removeKey: (sessionId: string, keyId: string) =>
    fetchApi<{ success: boolean }>(
      `${config.referralsApiBase}/distributions/sessions/${sessionId}/keys/${keyId}`,
      { method: 'DELETE' },
    ),
};

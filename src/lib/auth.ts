/**
 * SIWE authentication via the miniapp-sdk signMessage().
 *
 * Flow:
 * 1. POST /challenge { address, audience } → SIWE message + challengeId
 * 2. signMessage(message) → host passkey approval → ERC-1271 signature
 * 3. POST /verify { challengeId, signature } → JWT
 */
import { signMessage } from '@aboutcircles/miniapp-sdk';
import { config } from './config.js';

const AUDIENCE = 'referrals-api';

interface ChallengeResponse {
  challengeId: string;
  message: string;
  nonce: string;
  expiresAt: string;
}

interface VerifyResponse {
  token: string;
  address: string;
  chainId: number;
  expiresIn: number;
  verificationMethod: 'eoa' | 'erc1271';
}

let currentToken: string | null = null;

export function getToken(): string | null {
  const token = currentToken ?? sessionStorage.getItem('auth_token');
  if (token && isTokenExpired(token)) {
    clearAuth();
    return null;
  }
  return token;
}

/** Check if a JWT is expired (with 60s buffer) */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now() - 60_000;
  } catch {
    return true;
  }
}

export function setToken(token: string | null) {
  currentToken = token;
  if (token) {
    sessionStorage.setItem('auth_token', token);
  } else {
    sessionStorage.removeItem('auth_token');
  }
}

export function clearAuth() {
  setToken(null);
}

export async function authenticate(address: string): Promise<string> {
  // 1. Request challenge
  const challengeRes = await fetch(`${config.authApiBase}/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, audience: AUDIENCE }),
  });

  if (!challengeRes.ok) {
    const err = await challengeRes.json().catch(() => ({ error: 'Challenge request failed' }));
    throw new Error(err.error || `Challenge failed: ${challengeRes.status}`);
  }

  const challenge: ChallengeResponse = await challengeRes.json();

  // 2. Sign via SDK → host passkey approval
  const { signature } = await signMessage(challenge.message);

  // 3. Verify signature → get JWT
  const verifyRes = await fetch(`${config.authApiBase}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: challenge.challengeId, signature }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(err.error || `Verify failed: ${verifyRes.status}`);
  }

  const result: VerifyResponse = await verifyRes.json();
  setToken(result.token);
  return result.token;
}

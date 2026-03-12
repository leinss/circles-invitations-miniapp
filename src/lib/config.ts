// API base URLs — absolute for cross-origin requests from GitHub Pages iframe.
// In dev mode, use Vite proxy paths to avoid CORS issues (iframe origin != backend origin).
// Override via VITE_AUTH_API_BASE / VITE_REFERRALS_API_BASE for staging/dev.
export const config = {
  authApiBase: import.meta.env.VITE_AUTH_API_BASE || (import.meta.env.DEV ? '/api/auth' : 'https://auth.aboutcircles.com'),
  referralsApiBase: import.meta.env.VITE_REFERRALS_API_BASE || (import.meta.env.DEV ? '/api/referrals' : 'https://referrals.aboutcircles.com'),
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://rpc.gnosischain.com',
  distributionBaseUrl: import.meta.env.VITE_DISTRIBUTION_BASE_URL || 'https://app.gnosis.io',
} as const;

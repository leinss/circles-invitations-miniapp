// API base URLs — absolute for cross-origin requests from GitHub Pages iframe.
// Subdomain routing: auth.{base} and referrals.{base} (Caddy proxies to services).
// Override via VITE_AUTH_API_BASE / VITE_REFERRALS_API_BASE for staging/dev.
export const config = {
  authApiBase: import.meta.env.VITE_AUTH_API_BASE || 'https://auth.aboutcircles.com',
  referralsApiBase: import.meta.env.VITE_REFERRALS_API_BASE || 'https://referrals.aboutcircles.com',
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://rpc.gnosischain.com',
  distributionBaseUrl: import.meta.env.VITE_DISTRIBUTION_BASE_URL || 'https://app.gnosis.io',
} as const;

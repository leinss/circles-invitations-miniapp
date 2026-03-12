/**
 * Invitations Miniapp — entry point.
 *
 * Init sequence:
 * 1. SDK onWalletChange fires with connected address
 * 2. Auto-authenticate via SIWE → signMessage → JWT
 * 3. Render tab navigation + default view
 */
import { onWalletChange } from '@aboutcircles/miniapp-sdk';
import { authenticate, getToken, clearAuth } from './lib/auth.js';
import { renderReferrals } from './views/referrals.js';
import { renderCreate } from './views/create.js';
import { renderSessions } from './views/sessions.js';

type Tab = 'referrals' | 'create' | 'sessions';

const statusEl = document.getElementById('status')!;
const authStatusEl = document.getElementById('auth-status')!;
const tabsEl = document.getElementById('tabs')!;
const viewContainer = document.getElementById('view-container')!;

let currentAddress: string | null = null;
let activeTab: Tab = 'referrals';

function setStatus(connected: boolean, text: string) {
  statusEl.className = `status ${connected ? 'connected' : 'disconnected'}`;
  statusEl.textContent = text;
}

function showAuthStatus(text: string) {
  authStatusEl.style.display = 'block';
  authStatusEl.textContent = text;
  authStatusEl.className = 'status disconnected';
}

function hideAuthStatus() {
  authStatusEl.style.display = 'none';
}

function showTabs() {
  tabsEl.style.display = 'flex';
}

function hideTabs() {
  tabsEl.style.display = 'none';
  viewContainer.textContent = '';
}

function setActiveTab(tab: Tab) {
  activeTab = tab;
  tabsEl.querySelectorAll('.tab').forEach((el) => {
    el.classList.toggle('active', (el as HTMLElement).dataset.tab === tab);
  });
  renderView();
}

function renderView() {
  if (!currentAddress) return;
  viewContainer.textContent = '';

  switch (activeTab) {
    case 'referrals':
      renderReferrals(viewContainer, currentAddress);
      break;
    case 'create':
      renderCreate(viewContainer, currentAddress);
      break;
    case 'sessions':
      renderSessions(viewContainer, currentAddress);
      break;
  }
}

// Tab click handlers
tabsEl.querySelectorAll('.tab').forEach((el) => {
  el.addEventListener('click', () => {
    setActiveTab((el as HTMLElement).dataset.tab as Tab);
  });
});

// SDK wallet change listener
onWalletChange(async (address) => {
  if (address) {
    // Invalidate session if address changed (e.g. user switched wallets in host)
    if (currentAddress && currentAddress.toLowerCase() !== address.toLowerCase()) {
      clearAuth();
    }
    currentAddress = address;
    setStatus(true, `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);

    // Check for existing valid session (same address, not expired)
    const existingToken = getToken();
    if (existingToken) {
      hideAuthStatus();
      showTabs();
      setActiveTab('referrals');
      return;
    }

    // Authenticate via SIWE
    showAuthStatus('Authenticating...');
    try {
      await authenticate(address);
      hideAuthStatus();
      showTabs();
      setActiveTab('referrals');
    } catch (err) {
      authStatusEl.className = 'status disconnected';
      authStatusEl.textContent = `Auth failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  } else {
    currentAddress = null;
    clearAuth();
    setStatus(false, 'Waiting for wallet connection...');
    hideAuthStatus();
    hideTabs();
  }
});

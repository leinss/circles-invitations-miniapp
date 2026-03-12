/**
 * Referrals view — list of user's created referrals with status badges and copy buttons.
 */
import { referralsApi, type Referral } from '../lib/api.js';
import { config } from '../lib/config.js';
import { esc } from '../lib/escape.js';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fff8eb', color: '#b54708' },
  stale: { bg: '#faf5f1', color: '#6a6c8c' },
  confirmed: { bg: '#eff6ff', color: '#1e40af' },
  claimed: { bg: '#f0fdf3', color: '#158030' },
};

function badge(status: string): string {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:500;background:${esc(s.bg)};color:${esc(s.color)}">${esc(status)}</span>`;
}

function claimUrl(privateKey: string): string {
  return `${config.distributionBaseUrl}/${encodeURIComponent(privateKey)}`;
}

function referralRow(r: Referral): string {
  const date = new Date(r.createdAt).toLocaleDateString();
  const link = claimUrl(r.privateKey);
  // privateKey and accountAddress are hex strings (0x[0-9a-fA-F]+), safe to render
  // but we escape them anyway for defense in depth
  return `
    <div class="referral-row">
      <div class="referral-header">
        <span class="referral-date">${esc(date)}</span>
        ${badge(r.status)}
      </div>
      ${r.accountAddress ? `<div class="referral-account"><span class="label">Account:</span> <span class="mono">${esc(r.accountAddress)}</span></div>` : ''}
      <div class="referral-actions">
        <input type="text" readonly value="${esc(r.privateKey)}" class="referral-key" />
        <button class="btn-sm" data-copy="${esc(r.privateKey)}">Key</button>
        <button class="btn-sm" data-copy="${esc(link)}">Link</button>
      </div>
    </div>
  `;
}

export function renderReferrals(container: HTMLElement, walletAddress: string) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = '<h3>My Referrals</h3>';
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn-sm';
  refreshBtn.textContent = 'Refresh';
  header.appendChild(refreshBtn);

  const listEl = document.createElement('div');
  listEl.className = 'referrals-list';

  container.appendChild(header);
  container.appendChild(listEl);

  async function load() {
    listEl.textContent = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Loading referrals...';
    listEl.appendChild(loadingDiv);

    try {
      const res = await referralsApi.list(walletAddress);
      if (res.referrals.length === 0) {
        listEl.textContent = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty';
        emptyDiv.textContent = 'No referrals yet. Create your first invitation.';
        listEl.appendChild(emptyDiv);
        return;
      }
      // Referral data from our own backend: hex addresses, enum statuses, ISO dates — safe after escaping
      listEl.innerHTML = res.referrals.map(referralRow).join('');
      // Wire up copy buttons
      listEl.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.copy!);
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = orig), 1500);
        });
      });
    } catch (err) {
      listEl.textContent = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'result error show';
      errDiv.textContent = err instanceof Error ? err.message : 'Failed to load';
      listEl.appendChild(errDiv);
    }
  }

  refreshBtn.addEventListener('click', load);
  load();
}

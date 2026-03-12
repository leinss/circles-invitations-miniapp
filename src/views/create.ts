/**
 * Create invitation view — single + batch creation with results display.
 */
import { type Address } from 'viem';
import { createInvitations, type InvitationResult } from '../lib/transactions.js';
import { config } from '../lib/config.js';
import { INVITATION_FEE } from '../lib/contracts.js';
import { getCrcBalance, isModuleEnabled, isTrusted } from '../lib/rpc.js';
import { esc } from '../lib/escape.js';

export function renderCreate(container: HTMLElement, walletAddress: string) {
  container.textContent = '';

  // Build DOM safely
  const title = document.createElement('h3');
  title.textContent = 'Create Invitation';
  const subtitle = document.createElement('p');
  subtitle.className = 'subtitle';
  subtitle.textContent = 'Generate new invitation links on-chain (96 CRC each)';

  const preflightEl = document.createElement('div');
  preflightEl.id = 'preflight';
  preflightEl.className = 'loading';
  preflightEl.textContent = 'Checking on-chain status...';

  const formEl = document.createElement('div');
  formEl.id = 'create-form';
  formEl.style.display = 'none';
  formEl.innerHTML = `
    <div class="field">
      <label>Number of Invitations</label>
      <input type="number" id="batch-count" min="1" max="10" value="1" />
    </div>
    <div class="cost-display">
      Total cost: <strong id="total-cost">96</strong> CRC
    </div>
    <button id="create-btn" disabled>Create Invitation (96 CRC)</button>
  `;

  const resultEl = document.createElement('div');
  resultEl.id = 'create-result';
  resultEl.style.display = 'none';

  container.append(title, subtitle, preflightEl, formEl, resultEl);

  const batchInput = formEl.querySelector<HTMLInputElement>('#batch-count')!;
  const costEl = formEl.querySelector<HTMLElement>('#total-cost')!;
  const createBtn = formEl.querySelector<HTMLButtonElement>('#create-btn')!;

  const addr = walletAddress as Address;

  // Preflight checks
  async function runPreflight() {
    preflightEl.style.display = 'block';
    preflightEl.textContent = 'Checking on-chain status...';
    preflightEl.className = 'loading';
    formEl.style.display = 'none';
    resultEl.style.display = 'none';

    try {
      const [moduleEnabled, trusted, balance] = await Promise.all([
        isModuleEnabled(addr),
        isTrusted(addr, addr),
        getCrcBalance(addr),
      ]);

      const affordable = Number(balance / INVITATION_FEE);

      if (!moduleEnabled) {
        preflightEl.className = '';
        preflightEl.textContent = '';
        const errDiv = document.createElement('div');
        errDiv.className = 'result error show';
        errDiv.textContent = 'InvitationModule is not enabled on your Safe. Enable it first, then refresh.';
        preflightEl.appendChild(errDiv);
        return;
      }

      if (!trusted) {
        preflightEl.className = '';
        preflightEl.textContent = '';
        const errDiv = document.createElement('div');
        errDiv.className = 'result error show';
        errDiv.textContent = 'Your Safe does not trust itself as an inviter. This is required for the invitation module.';
        preflightEl.appendChild(errDiv);
        return;
      }

      if (affordable === 0) {
        preflightEl.className = '';
        preflightEl.textContent = '';
        const errDiv = document.createElement('div');
        errDiv.className = 'result error show';
        errDiv.textContent = `Insufficient CRC balance. Need at least 96 CRC. Current: ${(Number(balance) / 1e18).toFixed(1)} CRC`;
        preflightEl.appendChild(errDiv);
        return;
      }

      // All checks passed
      preflightEl.style.display = 'none';
      formEl.style.display = 'block';
      batchInput.max = String(Math.min(10, affordable));
      createBtn.disabled = false;
    } catch (err) {
      preflightEl.className = '';
      preflightEl.textContent = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'result error show';
      errDiv.textContent = `Preflight check failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      preflightEl.appendChild(errDiv);
    }
  }

  // Update cost display
  batchInput.addEventListener('input', () => {
    const count = Math.max(1, Math.min(10, parseInt(batchInput.value) || 1));
    costEl.textContent = String(96 * count);
    createBtn.textContent = count > 1
      ? `Create ${count} Invitations (${96 * count} CRC)`
      : 'Create Invitation (96 CRC)';
  });

  // Create handler
  createBtn.addEventListener('click', async () => {
    const count = Math.max(1, Math.min(10, parseInt(batchInput.value) || 1));
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';
    resultEl.style.display = 'none';

    try {
      const invitations = await createInvitations(addr, count);
      showResults(invitations);
    } catch (err) {
      resultEl.style.display = 'block';
      resultEl.textContent = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'result error show';
      errDiv.textContent = err instanceof Error ? err.message : 'Failed to create';
      resultEl.appendChild(errDiv);
    } finally {
      createBtn.disabled = false;
      const c = parseInt(batchInput.value) || 1;
      createBtn.textContent = c > 1 ? `Create ${c} Invitations (${96 * c} CRC)` : 'Create Invitation (96 CRC)';
    }
  });

  function showResults(invitations: InvitationResult[]) {
    formEl.style.display = 'none';
    resultEl.style.display = 'block';
    resultEl.textContent = '';

    const successDiv = document.createElement('div');
    successDiv.className = 'result success show';
    successDiv.textContent = invitations.length > 1
      ? `${invitations.length} invitations created on-chain!`
      : 'Invitation created on-chain!';
    resultEl.appendChild(successDiv);

    // Invitation data: hex addresses, hex keys, hex tx hashes — safe after escaping
    invitations.forEach((inv, i) => {
      const link = `${config.distributionBaseUrl}/${encodeURIComponent(inv.privateKey)}`;
      const card = document.createElement('div');
      card.className = 'invitation-result';
      card.innerHTML = `
        <div class="result-header">${invitations.length > 1 ? `Invitation #${i + 1}` : 'Invitation Created'}</div>
        <div class="result-field">
          <span class="label">Account</span>
          <span class="mono">${esc(inv.accountAddress)}</span>
        </div>
        <div class="result-field">
          <span class="label">Claim Link</span>
          <div class="copy-row">
            <input type="text" readonly value="${esc(link)}" />
            <button class="btn-sm" data-copy="${esc(link)}">Copy</button>
          </div>
        </div>
        <div class="result-field">
          <span class="label">Private Key</span>
          <div class="copy-row">
            <input type="text" readonly value="${esc(inv.privateKey)}" />
            <button class="btn-sm" data-copy="${esc(inv.privateKey)}">Copy</button>
          </div>
        </div>
        <div class="result-field">
          <span class="label">Tx</span>
          <a href="https://gnosisscan.io/tx/${esc(inv.txHash)}" target="_blank" rel="noopener" class="mono">${esc(inv.txHash.slice(0, 16))}...</a>
        </div>
      `;
      resultEl.appendChild(card);
    });

    // Wire copy buttons
    resultEl.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copy!);
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = orig), 1500);
      });
    });

    const moreBtn = document.createElement('button');
    moreBtn.textContent = 'Create More';
    moreBtn.style.marginTop = '12px';
    moreBtn.addEventListener('click', () => {
      resultEl.style.display = 'none';
      formEl.style.display = 'block';
      runPreflight();
    });
    resultEl.appendChild(moreBtn);
  }

  runPreflight();
}

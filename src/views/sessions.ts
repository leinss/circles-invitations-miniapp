/**
 * Distribution Sessions view — CRUD sessions, add keys, pause/resume, slug URLs.
 */
import { sessionsApi, type Session } from '../lib/api.js';
import { config } from '../lib/config.js';
import { esc } from '../lib/escape.js';

function sessionCard(s: Session): string {
  const expiry = s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : 'No expiry';
  const distUrl = `${config.distributionBaseUrl}/d/${esc(s.slug)}`;
  // s.label is user-provided — must escape
  const label = s.label ? esc(s.label) : 'Untitled Session';
  return `
    <div class="session-card" data-session-id="${esc(s.id)}">
      <div class="session-header">
        <div>
          <strong>${label}</strong>
          <span class="session-slug mono">${esc(s.slug)}</span>
        </div>
        <span class="badge ${s.paused ? 'paused' : 'active'}">${s.paused ? 'Paused' : 'Active'}</span>
      </div>
      <div class="session-stats">
        <span>Queued: ${s.queuedCount}</span>
        <span>Dispatched: ${s.dispatchedCount}</span>
        <span>Claimed: ${s.claimedCount}</span>
        <span>Expires: ${esc(expiry)}</span>
      </div>
      <div class="session-url">
        <input type="text" readonly value="${esc(distUrl)}" />
        <button class="btn-sm" data-copy="${esc(distUrl)}">Copy URL</button>
      </div>
      <div class="session-actions">
        <button class="btn-sm" data-toggle-pause="${esc(s.id)}" data-paused="${s.paused}">${s.paused ? 'Resume' : 'Pause'}</button>
        <button class="btn-sm" data-add-keys="${esc(s.id)}">Add Keys</button>
        <button class="btn-sm btn-danger" data-delete-session="${esc(s.id)}">Delete</button>
      </div>
    </div>
  `;
}

export function renderSessions(container: HTMLElement, walletAddress: string) {
  container.textContent = '';

  // Header
  const header = document.createElement('div');
  header.className = 'view-header';
  const h3 = document.createElement('h3');
  h3.textContent = 'Distribution Sessions';
  const newBtn = document.createElement('button');
  newBtn.className = 'btn-sm';
  newBtn.textContent = 'New Session';
  header.append(h3, newBtn);

  // Create session form (static structure, no user content)
  const createFormEl = document.createElement('div');
  createFormEl.style.display = 'none';
  createFormEl.innerHTML = `
    <div class="field">
      <label>Label</label>
      <input type="text" id="session-label" placeholder="e.g. ETHDenver booth" />
    </div>
    <div class="field">
      <label>Expires At (optional)</label>
      <input type="datetime-local" id="session-expiry" />
    </div>
    <div class="form-actions">
      <button id="save-session-btn">Create Session</button>
      <button id="cancel-session-btn" class="btn-sm">Cancel</button>
    </div>
  `;

  const listEl = document.createElement('div');
  listEl.id = 'sessions-list';

  // Add keys modal (static structure)
  const keysModal = document.createElement('div');
  keysModal.className = 'modal';
  keysModal.style.display = 'none';
  keysModal.innerHTML = `
    <div class="modal-content">
      <h3>Add Keys to Session</h3>
      <p class="subtitle">Paste private keys (one per line) from your referrals</p>
      <div class="field">
        <textarea id="keys-input" rows="6" placeholder="0x...\n0x...\n0x..."></textarea>
      </div>
      <div id="add-keys-result" style="display:none"></div>
      <div class="form-actions">
        <button id="submit-keys-btn">Add Keys</button>
        <button id="close-keys-modal" class="btn-sm">Cancel</button>
      </div>
    </div>
  `;

  container.append(header, createFormEl, listEl, keysModal);

  let activeSessionId: string | null = null;

  async function loadSessions() {
    listEl.textContent = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Loading sessions...';
    listEl.appendChild(loadingDiv);

    try {
      const res = await sessionsApi.list(walletAddress);
      if (res.sessions.length === 0) {
        listEl.textContent = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty';
        emptyDiv.textContent = 'No distribution sessions yet.';
        listEl.appendChild(emptyDiv);
        return;
      }
      // Session data: UUIDs, slugs (alphanumeric), integers, ISO dates, user label (escaped)
      listEl.innerHTML = res.sessions.map(sessionCard).join('');
      wireSessionActions();
    } catch (err) {
      listEl.textContent = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'result error show';
      errDiv.textContent = err instanceof Error ? err.message : 'Failed to load';
      listEl.appendChild(errDiv);
    }
  }

  function wireSessionActions() {
    // Copy buttons
    listEl.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copy!);
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = orig), 1500);
      });
    });

    // Toggle pause
    listEl.querySelectorAll<HTMLButtonElement>('[data-toggle-pause]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.togglePause!;
        const isPaused = btn.dataset.paused === 'true';
        btn.disabled = true;
        try {
          await sessionsApi.update(id, { paused: !isPaused });
          await loadSessions();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to update');
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Add keys
    listEl.querySelectorAll<HTMLButtonElement>('[data-add-keys]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeSessionId = btn.dataset.addKeys!;
        keysModal.style.display = 'flex';
        (keysModal.querySelector('#keys-input') as HTMLTextAreaElement).value = '';
        const resultDiv = keysModal.querySelector<HTMLElement>('#add-keys-result')!;
        resultDiv.style.display = 'none';
        resultDiv.textContent = '';
      });
    });

    // Delete
    listEl.querySelectorAll<HTMLButtonElement>('[data-delete-session]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.deleteSession!;
        if (!confirm('Delete this session? Keys will be unlinked but not deleted.')) return;
        btn.disabled = true;
        try {
          await sessionsApi.delete(id);
          await loadSessions();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  // New session toggle
  newBtn.addEventListener('click', () => {
    createFormEl.style.display = createFormEl.style.display === 'none' ? 'block' : 'none';
  });

  createFormEl.querySelector('#cancel-session-btn')!.addEventListener('click', () => {
    createFormEl.style.display = 'none';
  });

  // Save session
  createFormEl.querySelector('#save-session-btn')!.addEventListener('click', async () => {
    const label = (createFormEl.querySelector('#session-label') as HTMLInputElement).value.trim();
    const expiryInput = (createFormEl.querySelector('#session-expiry') as HTMLInputElement).value;
    const btn = createFormEl.querySelector('#save-session-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
      await sessionsApi.create({
        inviterAddress: walletAddress,
        label: label || undefined,
        expiresAt: expiryInput ? new Date(expiryInput).toISOString() : undefined,
      });
      createFormEl.style.display = 'none';
      (createFormEl.querySelector('#session-label') as HTMLInputElement).value = '';
      (createFormEl.querySelector('#session-expiry') as HTMLInputElement).value = '';
      await loadSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Session';
    }
  });

  // Add keys modal
  keysModal.querySelector('#close-keys-modal')!.addEventListener('click', () => {
    keysModal.style.display = 'none';
    activeSessionId = null;
  });

  keysModal.querySelector('#submit-keys-btn')!.addEventListener('click', async () => {
    if (!activeSessionId) return;
    const textarea = keysModal.querySelector('#keys-input') as HTMLTextAreaElement;
    const resultDiv = keysModal.querySelector('#add-keys-result') as HTMLElement;
    const keys = textarea.value
      .split('\n')
      .map((k) => k.trim())
      .filter((k) => k.startsWith('0x') && k.length === 66);

    if (keys.length === 0) {
      resultDiv.style.display = 'block';
      resultDiv.textContent = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'result error show';
      errDiv.textContent = 'No valid keys found. Each key must be 0x + 64 hex chars.';
      resultDiv.appendChild(errDiv);
      return;
    }

    const btn = keysModal.querySelector('#submit-keys-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Adding...';

    try {
      const res = await sessionsApi.addKeys(activeSessionId, keys);
      resultDiv.style.display = 'block';
      resultDiv.textContent = '';
      const successDiv = document.createElement('div');
      successDiv.className = 'result success show';
      successDiv.textContent = `Added: ${res.added}, Skipped: ${res.skipped}, Already claimed: ${res.claimed}`;
      resultDiv.appendChild(successDiv);
      await loadSessions();
    } catch (err) {
      resultDiv.style.display = 'block';
      resultDiv.textContent = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'result error show';
      errDiv.textContent = err instanceof Error ? err.message : 'Failed to add keys';
      resultDiv.appendChild(errDiv);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Keys';
    }
  });

  loadSessions();
}

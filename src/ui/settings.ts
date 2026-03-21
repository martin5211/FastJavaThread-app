import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

export interface McpSettings {
  port: number;
  authEnabled: boolean;
  authToken: string;
  autoStart: boolean;
  nodePath: string;
}

const DEFAULTS: McpSettings = {
  port: 3100,
  authEnabled: false,
  authToken: '',
  autoStart: false,
  nodePath: '',
};

const STORAGE_KEY = 'mcpSettings';

export function getMcpSettings(): McpSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveMcpSettings(settings: McpSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const ICON_GEAR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

export function initSettings(onSave?: (settings: McpSettings) => void, getError?: () => string | undefined): void {
  const btn = document.getElementById('btn-settings')!;
  btn.innerHTML = ICON_GEAR;

  btn.addEventListener('click', () => openSettingsModal(onSave, getError));
}

function openSettingsModal(onSave?: (settings: McpSettings) => void, getError?: () => string | undefined): void {
  const existing = document.getElementById('settings-modal');
  if (existing) existing.remove();

  const settings = getMcpSettings();
  const mcpError = getError?.();

  const overlay = document.createElement('div');
  overlay.id = 'settings-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-panel">
      <div class="modal-header">
        <h2>MCP Settings</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        ${mcpError ? `<div class="mcp-error-banner">${escapeAttr(mcpError)}</div>` : ''}
        <div class="form-field">
          <label for="mcp-node-path">Node.js path</label>
          <div class="input-row">
            <input type="text" id="mcp-node-path" value="${escapeAttr(settings.nodePath)}" placeholder="Auto-detect from PATH" />
            <button class="btn-sm" id="btn-detect-node" title="Auto-detect">Detect</button>
            <button class="btn-sm" id="btn-browse-node" title="Browse...">Browse</button>
          </div>
          <div id="node-status" class="field-hint"></div>
        </div>
        <div class="form-field">
          <label for="mcp-port">Port</label>
          <input type="number" id="mcp-port" value="${settings.port}" min="1024" max="65535" />
        </div>
        <div class="form-field">
          <label for="mcp-auth-enabled">
            <input type="checkbox" id="mcp-auth-enabled" ${settings.authEnabled ? 'checked' : ''} />
            Enable authentication
          </label>
        </div>
        <div class="form-field auth-only" ${!settings.authEnabled ? 'style="display:none"' : ''}>
          <label for="mcp-auth-token">Auth token</label>
          <input type="text" id="mcp-auth-token" value="${escapeAttr(settings.authToken)}" placeholder="Bearer token" />
        </div>
        <div class="form-field">
          <label for="mcp-autostart">
            <input type="checkbox" id="mcp-autostart" ${settings.autoStart ? 'checked' : ''} />
            Start MCP server on app launch
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel">Cancel</button>
        <button class="btn-save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const nodePathInput = overlay.querySelector('#mcp-node-path') as HTMLInputElement;
  const nodeStatus = overlay.querySelector('#node-status') as HTMLElement;

  // Auto-detect node
  overlay.querySelector('#btn-detect-node')!.addEventListener('click', async () => {
    nodeStatus.textContent = 'Detecting...';
    try {
      const path = await invoke<string>('detect_node_path');
      nodePathInput.value = path;
      nodeStatus.textContent = `Found: ${path}`;
      nodeStatus.className = 'field-hint success';
    } catch {
      nodeStatus.textContent = 'Not found in PATH. Use Browse to locate it manually.';
      nodeStatus.className = 'field-hint error';
    }
  });

  // Browse for node executable
  overlay.querySelector('#btn-browse-node')!.addEventListener('click', async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Node.js', extensions: ['exe', ''] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (selected) {
      const path = typeof selected === 'string' ? selected : selected;
      nodePathInput.value = path;
      nodeStatus.textContent = `Selected: ${path}`;
      nodeStatus.className = 'field-hint success';
    }
  });

  // Auth toggle
  const authCheckbox = overlay.querySelector('#mcp-auth-enabled') as HTMLInputElement;
  authCheckbox.addEventListener('change', () => {
    overlay.querySelectorAll('.auth-only').forEach(el => {
      (el as HTMLElement).style.display = authCheckbox.checked ? '' : 'none';
    });
  });

  // Close
  overlay.querySelector('.modal-close')!.addEventListener('click', () => overlay.remove());
  overlay.querySelector('.btn-cancel')!.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Save
  overlay.querySelector('.btn-save')!.addEventListener('click', () => {
    const updated: McpSettings = {
      port: parseInt((overlay.querySelector('#mcp-port') as HTMLInputElement).value, 10) || 3100,
      authEnabled: authCheckbox.checked,
      authToken: (overlay.querySelector('#mcp-auth-token') as HTMLInputElement).value,
      autoStart: (overlay.querySelector('#mcp-autostart') as HTMLInputElement).checked,
      nodePath: nodePathInput.value.trim(),
    };
    saveMcpSettings(updated);
    onSave?.(updated);
    overlay.remove();
  });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

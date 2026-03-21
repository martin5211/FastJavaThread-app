import { invoke } from '@tauri-apps/api/core';
import type { McpSettings } from '../ui/settings';

let running = false;
let lastError: string | undefined;
let statusCallback: ((running: boolean, error?: string) => void) | null = null;

export function onMcpStatusChange(cb: (running: boolean, error?: string) => void): void {
  statusCallback = cb;
}

function setRunning(value: boolean, error?: string): void {
  running = value;
  lastError = error;
  statusCallback?.(value, error);
}

export function isMcpRunning(): boolean {
  return running;
}

export function getMcpError(): string | undefined {
  return lastError;
}

export async function startMcpServer(settings: McpSettings): Promise<void> {
  if (running) return;

  try {
    const pid = await invoke<number>('start_mcp', {
      port: settings.port,
      authToken: settings.authEnabled ? settings.authToken : '',
      mcpScript: 'lib/FastJavaThread/out/src/mcp/server.js',
      nodePath: settings.nodePath || '',
    });
    console.log('MCP server started, pid:', pid);
    setRunning(true);
  } catch (err) {
    console.error('Failed to start MCP server:', err);
    setRunning(false, String(err));
  }
}

export async function stopMcpServer(): Promise<void> {
  if (!running) return;
  try {
    await invoke('stop_mcp');
    setRunning(false);
  } catch (err) {
    console.error('Failed to stop MCP server:', err);
    setRunning(false, String(err));
  }
}

export async function checkMcpStatus(): Promise<void> {
  try {
    const isRunning = await invoke<boolean>('mcp_running');
    if (isRunning !== running) {
      setRunning(isRunning);
    }
  } catch {
    // ignore
  }
}

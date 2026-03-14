import { parseThreadDump } from '@core/parser/parser';
import { ThreadInfo, ThreadState, AnalysisResult } from '@core/models/types';
import { detectDeadlocks } from '@core/utils/deadlock';
import { groupByState, getHotMethods } from '@core/utils/grouping';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { renderSidebar } from './ui/sidebar';
import { renderDashboard } from './ui/dashboard';
import { initTheme } from './ui/theme';

function analyze(text: string): AnalysisResult {
  const dump = parseThreadDump(text);
  const stateGroups = groupByState(dump.threads);
  const hotMethods = getHotMethods(dump.threads);
  const deadlocks = detectDeadlocks(dump.threads);
  return { dump, stateGroups, hotMethods, deadlocks };
}

function handleResult(result: AnalysisResult): void {
  renderSidebar(result, (thread: ThreadInfo) => {
    showThreadDetail(thread);
  });
  renderDashboard(result);
}

function showThreadDetail(thread: ThreadInfo): void {
  const detail = document.getElementById('threadDetail')!;
  detail.style.display = 'block';
  detail.innerHTML = `
    <h3>${escapeHtml(thread.name)}</h3>
    <div class="meta">
      <span>State: ${thread.state}</span>
      <span>TID: ${thread.tid}</span>
      <span>NID: ${thread.nid}</span>
      <span>${thread.daemon ? 'daemon' : ''}</span>
      <span>Priority: ${thread.priority}</span>
    </div>
    <pre>${escapeHtml(thread.raw)}</pre>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function openFile(): Promise<void> {
  const selected = await open({
    multiple: false,
    filters: [
      { name: 'Thread Dump', extensions: ['tdump', 'txt', 'log', 'out'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (!selected) return;
  const path = typeof selected === 'string' ? selected : selected;
  const text = await readTextFile(path);
  handleResult(analyze(text));
}

async function handleDrop(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const text = await readTextFile(paths[0]);
  handleResult(analyze(text));
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  document.getElementById('btn-open')!.addEventListener('click', () => {
    openFile();
  });

  // Drag-drop via Tauri
  const appWindow = getCurrentWebviewWindow();
  appWindow.onDragDropEvent((event) => {
    if (event.payload.type === 'drop') {
      const paths = event.payload.paths;
      handleDrop(paths);
    }
  });
});

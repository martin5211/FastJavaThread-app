import { AnalysisResult, ThreadInfo, ThreadState } from '@core/models/types';

const STATE_COLORS: Record<string, string> = {
  RUNNABLE: '#4caf50',
  BLOCKED: '#f44336',
  WAITING: '#ff9800',
  TIMED_WAITING: '#2196f3',
  NEW: '#9c27b0',
  TERMINATED: '#607d8b',
  UNKNOWN: '#795548',
};

export function renderSidebar(
  result: AnalysisResult,
  onSelect: (thread: ThreadInfo) => void
): void {
  const sidebar = document.getElementById('sidebar')!;
  sidebar.innerHTML = '';

  for (const [state, threads] of result.stateGroups) {
    const group = document.createElement('div');
    group.className = 'state-group';

    const header = document.createElement('div');
    header.className = 'state-header';
    header.innerHTML = `
      <span class="state-dot" style="background:${STATE_COLORS[state] || '#999'}"></span>
      <span>${state} (${threads.length})</span>
    `;

    const threadList = document.createElement('div');
    threadList.className = 'state-threads';

    for (const thread of threads) {
      const item = document.createElement('div');
      item.className = 'thread-item';
      item.textContent = thread.name;
      item.addEventListener('click', () => {
        sidebar.querySelectorAll('.thread-item.active').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        onSelect(thread);
      });
      threadList.appendChild(item);
    }

    header.addEventListener('click', () => {
      threadList.classList.toggle('collapsed');
    });

    group.appendChild(header);
    group.appendChild(threadList);
    sidebar.appendChild(group);
  }
}

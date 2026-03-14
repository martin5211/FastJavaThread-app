import { Chart } from 'chart.js/auto';
import { AnalysisResult, ThreadState } from '@core/models/types';

const STATE_COLORS: Record<string, string> = {
  RUNNABLE: '#4caf50',
  BLOCKED: '#f44336',
  WAITING: '#ff9800',
  TIMED_WAITING: '#2196f3',
  NEW: '#9c27b0',
  TERMINATED: '#607d8b',
  UNKNOWN: '#795548',
};

let chartInstance: Chart | null = null;

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderSummary(stateGroups: Map<ThreadState, any[]>, totalThreads: number): void {
  const container = document.getElementById('summary')!;
  let html = `<div class="summary-card"><span class="count">${totalThreads}</span><span class="label">Total Threads</span></div>`;
  for (const [state, threads] of stateGroups) {
    html += `<div class="summary-card"><span class="count">${threads.length}</span><span class="label">${escapeHtml(state)}</span></div>`;
  }
  container.innerHTML = html;
}

function renderChart(stateGroups: Map<ThreadState, any[]>): void {
  const canvas = document.getElementById('stateChart') as HTMLCanvasElement | null;
  if (!canvas) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = Array.from(stateGroups.keys());
  const data = Array.from(stateGroups.values()).map(t => t.length);
  const fgColor = getComputedStyle(document.body).getPropertyValue('--fg-primary').trim() || '#ccc';

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map(l => STATE_COLORS[l] || '#999'),
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: fgColor },
        },
      },
    },
  });
}

function renderHotMethods(methods: { method: string; count: number }[]): void {
  const container = document.getElementById('hotMethods')!;
  if (!methods.length) {
    container.innerHTML = '';
    return;
  }

  let html = '<h3>Hot Methods</h3><table><tr><th>#</th><th>Method</th><th>Count</th></tr>';
  methods.forEach((m, i) => {
    html += `<tr><td>${i + 1}</td><td>${escapeHtml(m.method)}</td><td>${m.count}</td></tr>`;
  });
  html += '</table>';
  container.innerHTML = html;
}

function renderDeadlocks(deadlocks: AnalysisResult['deadlocks']): void {
  const container = document.getElementById('deadlocks')!;
  if (!deadlocks || deadlocks.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  let html = '<h2>Deadlock Detected!</h2>';
  deadlocks.forEach((cycle, i) => {
    html += `<div class="deadlock-cycle"><strong>Cycle ${i + 1}:</strong><ul>`;
    cycle.threads.forEach(t => {
      html += `<li>${escapeHtml(t.name)} (${escapeHtml(t.state)})</li>`;
    });
    html += '</ul></div>';
  });
  container.innerHTML = html;
}

export function renderDashboard(result: AnalysisResult): void {
  const totalThreads = result.dump.threads.length;
  renderSummary(result.stateGroups, totalThreads);
  renderChart(result.stateGroups);
  renderHotMethods(result.hotMethods);
  renderDeadlocks(result.deadlocks);
}

import { parseThreadDump } from '@core/parser/parser';
import { detectDeadlocks } from '@core/utils/deadlock';
import * as fs from 'fs';
import * as path from 'path';

const samplePath = path.resolve(__dirname, '../lib/FastJavaThread/samples/sample1.tdump');
const sampleText = fs.readFileSync(samplePath, 'utf-8');

describe('detectDeadlocks', () => {
  it('should detect the deadlock cycle between worker-1 and worker-2', () => {
    const dump = parseThreadDump(sampleText);
    const deadlocks = detectDeadlocks(dump.threads);

    expect(deadlocks.length).toBeGreaterThanOrEqual(1);
    const cycle = deadlocks[0];
    const names = cycle.threads.map(t => t.name).sort();
    expect(names).toContain('worker-1');
    expect(names).toContain('worker-2');
  });

  it('should return empty array for threads without deadlocks', () => {
    const dump = parseThreadDump(sampleText);
    const nonBlocked = dump.threads.filter(t => t.state !== 'BLOCKED');
    const deadlocks = detectDeadlocks(nonBlocked);
    expect(deadlocks).toEqual([]);
  });

  it('should include lock info in the cycle', () => {
    const dump = parseThreadDump(sampleText);
    const deadlocks = detectDeadlocks(dump.threads);
    if (deadlocks.length > 0) {
      expect(deadlocks[0].locks.length).toBeGreaterThan(0);
    }
  });
});

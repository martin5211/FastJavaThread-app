import { parseThreadDump } from '@core/parser/parser';
import { groupByState, getHotMethods } from '@core/utils/grouping';
import * as fs from 'fs';
import * as path from 'path';

const samplePath = path.resolve(__dirname, '../lib/FastJavaThread/samples/sample1.tdump');
const sampleText = fs.readFileSync(samplePath, 'utf-8');

describe('groupByState', () => {
  const dump = parseThreadDump(sampleText);
  const groups = groupByState(dump.threads);

  it('should group threads by their state', () => {
    expect(groups.size).toBeGreaterThan(0);
  });

  it('should have RUNNABLE threads', () => {
    const runnable = groups.get('RUNNABLE');
    expect(runnable).toBeDefined();
    expect(runnable!.length).toBeGreaterThanOrEqual(2);
  });

  it('should have BLOCKED threads', () => {
    const blocked = groups.get('BLOCKED');
    expect(blocked).toBeDefined();
    expect(blocked!.length).toBe(2);
  });

  it('should have WAITING threads', () => {
    const waiting = groups.get('WAITING');
    expect(waiting).toBeDefined();
    expect(waiting!.length).toBeGreaterThanOrEqual(1);
  });

  it('total threads across groups should match dump', () => {
    let total = 0;
    for (const threads of groups.values()) {
      total += threads.length;
    }
    expect(total).toBe(dump.threads.length);
  });
});

describe('getHotMethods', () => {
  const dump = parseThreadDump(sampleText);

  it('should return hot methods sorted by count desc', () => {
    const hot = getHotMethods(dump.threads);
    expect(hot.length).toBeGreaterThan(0);
    for (let i = 1; i < hot.length; i++) {
      expect(hot[i - 1].count).toBeGreaterThanOrEqual(hot[i].count);
    }
  });

  it('should respect topN parameter', () => {
    const hot = getHotMethods(dump.threads, 3);
    expect(hot.length).toBeLessThanOrEqual(3);
  });

  it('should contain method names with class prefix', () => {
    const hot = getHotMethods(dump.threads);
    for (const m of hot) {
      expect(m.method).toContain('.');
    }
  });
});

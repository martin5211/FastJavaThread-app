import { parseThreadDump } from '@core/parser/parser';
import * as fs from 'fs';
import * as path from 'path';

const samplePath = path.resolve(__dirname, '../lib/FastJavaThread/samples/sample1.tdump');
const sampleText = fs.readFileSync(samplePath, 'utf-8');

describe('parseThreadDump', () => {
  const dump = parseThreadDump(sampleText);

  it('should extract timestamp', () => {
    expect(dump.timestamp).toBe('2024-01-15 10:30:45');
  });

  it('should extract JVM version', () => {
    expect(dump.jvmVersion).toContain('Java HotSpot');
  });

  it('should parse all threads with headers', () => {
    // Threads with quoted names that match the regex
    expect(dump.threads.length).toBeGreaterThanOrEqual(8);
  });

  it('should parse thread name correctly', () => {
    const main = dump.threads.find(t => t.name === 'main');
    expect(main).toBeDefined();
    expect(main!.state).toBe('RUNNABLE');
  });

  it('should parse daemon flag', () => {
    const worker = dump.threads.find(t => t.name === 'worker-1');
    expect(worker).toBeDefined();
    expect(worker!.daemon).toBe(true);

    const main = dump.threads.find(t => t.name === 'main');
    expect(main!.daemon).toBe(false);
  });

  it('should parse stack frames', () => {
    const main = dump.threads.find(t => t.name === 'main')!;
    expect(main.stackFrames.length).toBeGreaterThanOrEqual(2);
    expect(main.stackFrames[0].className).toBe('com.example.app.MainProcessor');
    expect(main.stackFrames[0].methodName).toBe('processData');
  });

  it('should parse lock info', () => {
    const worker1 = dump.threads.find(t => t.name === 'worker-1')!;
    expect(worker1.locks.length).toBeGreaterThanOrEqual(2);
    const waitingLock = worker1.locks.find(l => l.action === 'waiting to lock');
    expect(waitingLock).toBeDefined();
    expect(waitingLock!.lockId).toBe('0x00000000c0000001');
  });

  it('should identify BLOCKED state', () => {
    const blocked = dump.threads.filter(t => t.state === 'BLOCKED');
    expect(blocked.length).toBe(2);
  });

  it('should identify TIMED_WAITING state', () => {
    const tw = dump.threads.filter(t => t.state === 'TIMED_WAITING');
    expect(tw.length).toBeGreaterThanOrEqual(1);
  });
});

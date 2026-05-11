// Minimal structured logger. See docs/adr/0011-logging-strategy.md.

type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const isProd = import.meta.env?.PROD === true;
const debugFlag = typeof localStorage !== 'undefined' && localStorage.getItem('debug') === '1';
const THRESHOLD: Level = isProd && !debugFlag ? 'warn' : 'debug';

interface LogEntry {
  level: Level;
  code: string;
  meta?: Record<string, string | number | boolean>;
  at: number;
}

const RING_CAPACITY = 100;
const ring: LogEntry[] = [];

function record(entry: LogEntry): void {
  ring.push(entry);
  if (ring.length > RING_CAPACITY) ring.shift();
}

function emit(level: Level, code: string, meta?: Record<string, string | number | boolean>): void {
  const entry: LogEntry = { level, code, meta, at: Date.now() };
  record(entry);
  if (ORDER[level] < ORDER[THRESHOLD]) return;
  const payload = meta ? `${code} ${JSON.stringify(meta)}` : code;
  // Only warn/error reach the console per ESLint policy; debug/info are visible only via logger.recent().
  if (level === 'warn') console.warn(`[warn] ${payload}`);
  else if (level === 'error') console.error(`[error] ${payload}`);
}

export const logger = {
  debug: (code: string, meta?: Record<string, string | number | boolean>) =>
    emit('debug', code, meta),
  info: (code: string, meta?: Record<string, string | number | boolean>) =>
    emit('info', code, meta),
  warn: (code: string, meta?: Record<string, string | number | boolean>) =>
    emit('warn', code, meta),
  error: (code: string, meta?: Record<string, string | number | boolean>) =>
    emit('error', code, meta),
  recent(): readonly LogEntry[] {
    return ring.slice();
  },
};

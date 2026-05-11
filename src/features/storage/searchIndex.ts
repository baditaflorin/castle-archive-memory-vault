// In-memory search index. DuckDB-WASM holds the table; we hydrate from decrypted
// reflections on demand. The index is disposable — drop and rebuild on schema change.
// See docs/adr/0005-client-side-storage.md.

import { appError, ERROR_CODES } from '../../shared/utils/errors.js';
import { logger } from '../../shared/utils/logger.js';
import type { DecryptedReflection } from '../../shared/types.js';

type DuckDBNS = typeof import('@duckdb/duckdb-wasm');
type AsyncDuckDB = import('@duckdb/duckdb-wasm').AsyncDuckDB;
type AsyncDuckDBConnection = import('@duckdb/duckdb-wasm').AsyncDuckDBConnection;

let dbPromise: Promise<{ db: AsyncDuckDB; conn: AsyncDuckDBConnection }> | null = null;

async function init(): Promise<{ db: AsyncDuckDB; conn: AsyncDuckDBConnection }> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    try {
      const duckdb: DuckDBNS = await import('@duckdb/duckdb-wasm');
      const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
      if (!bundle.mainWorker) throw new Error('no main worker URL in bundle');
      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
      );
      const worker = new Worker(workerUrl);
      const log = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
      const db = new duckdb.AsyncDuckDB(log, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      URL.revokeObjectURL(workerUrl);
      const conn = await db.connect();
      await conn.query(`
        CREATE TABLE reflections (
          id VARCHAR PRIMARY KEY,
          created_at BIGINT,
          text VARCHAR,
          title VARCHAR,
          embedding DOUBLE[],
          duration_ms INTEGER
        );
      `);
      return { db, conn };
    } catch (cause) {
      dbPromise = null;
      throw appError(ERROR_CODES.SEARCH_DUCKDB_INIT_FAILED, cause);
    }
  })();
  return dbPromise;
}

export interface SearchHit {
  id: string;
  createdAt: number;
  title: string;
  snippet: string;
  durationMs: number;
  textScore: number;
  vectorScore: number;
  combined: number;
}

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlArray(xs: number[]): string {
  if (xs.length === 0) return '[]::DOUBLE[]';
  return `[${xs.map((n) => (Number.isFinite(n) ? n.toString() : '0')).join(',')}]::DOUBLE[]`;
}

export async function rebuildIndex(reflections: DecryptedReflection[]): Promise<void> {
  const { conn } = await init();
  await conn.query('DELETE FROM reflections;');
  if (reflections.length === 0) return;
  // Insert as a single VALUES list when small; chunk otherwise.
  const CHUNK = 50;
  for (let i = 0; i < reflections.length; i += CHUNK) {
    const slice = reflections.slice(i, i + CHUNK);
    const values = slice
      .map(
        (r) =>
          `(${sqlString(r.id)}, ${r.createdAt}, ${sqlString(r.payload.transcript)}, ` +
          `${sqlString(r.payload.metadata.title ?? '')}, ${sqlArray(r.payload.embedding)}, ${r.durationMs})`
      )
      .join(',\n');
    await conn.query(`INSERT INTO reflections VALUES ${values};`);
  }
  logger.info('search/index-rebuilt', { rows: reflections.length });
}

const TEXT_WEIGHT = 0.4;
const VECTOR_WEIGHT = 0.6;

export async function search(
  query: string,
  queryEmbedding: number[],
  limit = 20
): Promise<SearchHit[]> {
  const { conn } = await init();
  const needle = query.trim().toLowerCase();
  const needleLit = sqlString(needle);
  const vectorLit = sqlArray(queryEmbedding);
  const sql = `
    WITH scored AS (
      SELECT
        id, created_at, text, title, duration_ms,
        CASE WHEN ${needleLit} = '' THEN 0.0
             WHEN LOWER(text) LIKE '%' || ${needleLit} || '%'
               OR LOWER(title) LIKE '%' || ${needleLit} || '%' THEN 1.0
             ELSE 0.0
        END AS text_score,
        COALESCE(list_cosine_similarity(embedding, ${vectorLit}), 0.0) AS vector_score
      FROM reflections
    )
    SELECT id, created_at, text, title, duration_ms, text_score, vector_score,
           (text_score * ${TEXT_WEIGHT} + vector_score * ${VECTOR_WEIGHT}) AS combined
    FROM scored
    ORDER BY combined DESC, created_at DESC
    LIMIT ${limit};
  `;
  const result = await conn.query(sql);
  const rows = result.toArray() as Array<{
    id: string;
    created_at: bigint | number;
    text: string;
    title: string;
    duration_ms: number;
    text_score: number;
    vector_score: number;
    combined: number;
  }>;
  return rows.map((row) => ({
    id: row.id,
    createdAt: Number(row.created_at),
    title: row.title || '(untitled)',
    snippet: snippet(row.text, needle),
    durationMs: row.duration_ms,
    textScore: row.text_score,
    vectorScore: row.vector_score,
    combined: row.combined,
  }));
}

function snippet(text: string, needle: string): string {
  if (!text) return '';
  if (!needle) return text.slice(0, 160) + (text.length > 160 ? '…' : '');
  const idx = text.toLowerCase().indexOf(needle);
  if (idx < 0) return text.slice(0, 160) + (text.length > 160 ? '…' : '');
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + needle.length + 100);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

export async function disposeIndex(): Promise<void> {
  if (!dbPromise) return;
  try {
    const { db, conn } = await dbPromise;
    await conn.close();
    await db.terminate();
  } finally {
    dbPromise = null;
  }
}

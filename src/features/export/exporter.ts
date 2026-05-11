// Clip export — Markdown and HTML.
// See docs/adr/0006-wasm-modules.md for why we use `marked` instead of Pandoc.

import { marked } from 'marked';
import { appError, ERROR_CODES } from '../../shared/utils/errors.js';
import type { DecryptedReflection, ExportFormat } from '../../shared/types.js';
import { formatDateTime, formatDuration } from '../../shared/utils/time.js';

function safeTitle(reflection: DecryptedReflection): string {
  const t = reflection.payload.metadata.title?.trim();
  if (t) return t;
  return `reflection-${new Date(reflection.createdAt).toISOString().slice(0, 10)}`;
}

function fileSlug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'reflection'
  );
}

function buildMarkdown(reflection: DecryptedReflection): string {
  const lines: string[] = [];
  lines.push(`---`);
  lines.push(`title: ${JSON.stringify(safeTitle(reflection))}`);
  lines.push(`date: ${new Date(reflection.createdAt).toISOString()}`);
  lines.push(`duration_ms: ${reflection.durationMs}`);
  if (reflection.payload.metadata.language) {
    lines.push(`language: ${reflection.payload.metadata.language}`);
  }
  lines.push(`---`);
  lines.push('');
  lines.push(`# ${safeTitle(reflection)}`);
  lines.push('');
  lines.push(
    `*${formatDateTime(reflection.createdAt)} · ${formatDuration(reflection.durationMs)}*`
  );
  lines.push('');
  lines.push(reflection.payload.transcript.trim() || '_(no transcript)_');
  if (reflection.payload.segments.length > 0) {
    lines.push('');
    lines.push('## Timestamped segments');
    lines.push('');
    for (const s of reflection.payload.segments) {
      lines.push(
        `- **${formatDuration(s.start * 1000)}–${formatDuration(s.end * 1000)}** ${s.text.trim()}`
      );
    }
  }
  return lines.join('\n');
}

function wrapHtml(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: 'Cormorant Garamond', Georgia, serif; max-width: 720px; margin: 3rem auto; padding: 0 1.5rem; color: #1c1b18; line-height: 1.6; }
    h1 { font-weight: 600; }
    blockquote { border-left: 3px solid #c2a958; margin: 0; padding-left: 1rem; color: #555; font-style: italic; }
    ul { padding-left: 1.5rem; }
    li { margin: 0.25rem 0; }
    code { background: #f4eedb; padding: 0.1rem 0.3rem; border-radius: 3px; }
    @media (prefers-color-scheme: dark) {
      body { background: #141312; color: #fbf8f1; }
      code { background: #2a261e; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface ExportResult {
  blob: Blob;
  filename: string;
}

export async function exportClip(
  reflection: DecryptedReflection,
  format: ExportFormat
): Promise<ExportResult> {
  const md = buildMarkdown(reflection);
  const slug = fileSlug(safeTitle(reflection));
  if (format === 'markdown') {
    return {
      blob: new Blob([md], { type: 'text/markdown;charset=utf-8' }),
      filename: `${slug}.md`,
    };
  }
  if (format === 'html') {
    const body = await marked.parse(md, { async: true });
    return {
      blob: new Blob([wrapHtml(safeTitle(reflection), body)], { type: 'text/html;charset=utf-8' }),
      filename: `${slug}.html`,
    };
  }
  throw appError(ERROR_CODES.EXPORT_FORMAT_UNSUPPORTED, undefined, { format });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

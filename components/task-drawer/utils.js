export async function readResponse(r) {
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) {
    throw new Error(data.error || (r.status === 503 ? 'Трекер не подключён' : `Ошибка ${r.status}`));
  }
  return data;
}

export function formatBytes(size) {
  const n = Number(size || 0);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

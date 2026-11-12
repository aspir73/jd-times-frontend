/** SQLite CURRENT_TIMESTAMP('YYYY-MM-DD HH:MM:SS', UTC) 또는 epoch ms → Date */
export function parseServerTime(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return new Date(value);
  const d = new Date(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "방금 전 / 5분 전 / 3시간 전 / 2일 전 / 2026.10.01" */
export function formatRelative(value) {
  const d = parseServerTime(value);
  if (!d) return '—';
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return formatDate(value);
}

/** KST 기준 "2026.10.01" */
export function formatDate(value) {
  const d = parseServerTime(value);
  if (!d) return '—';
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, '.');
}

export const STATUS_LABELS = { pending: '승인 대기', active: '활성', suspended: '정지' };

export const STATUS_STYLES = {
  pending: 'border-(--color-signal-amber)/50 bg-(--color-signal-amber)/10 text-(--color-signal-amber)',
  active: 'border-(--color-wire-blue)/40 bg-(--color-wire-blue)/10 text-(--color-wire-blue)',
  suspended: 'border-(--color-stamp-red)/40 bg-(--color-stamp-red)/10 text-(--color-stamp-red)',
};

export const buttonClass =
  'rounded border border-(--color-rule) px-2.5 py-1 text-xs text-(--color-ink-soft) hover:bg-(--color-ink)/5 cursor-pointer disabled:opacity-40 disabled:cursor-default';

export const primaryButtonClass =
  'rounded bg-(--color-ink) text-(--color-paper) px-3 py-1.5 text-xs font-medium hover:opacity-90 cursor-pointer disabled:opacity-50';

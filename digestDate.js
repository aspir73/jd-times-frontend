/**
 * 스크랩 시각(KST) → "다이제스트 날짜(YYYY-MM-DD)" 계산.
 * 백엔드 src/utils/digestDate.js와 동일한 규칙:
 * 오전 9시 이전 스크랩 = 그날 다이제스트 / 9시 이후 = 다음날 다이제스트.
 * 주말(토/일)이면 다음 월요일로 이월.
 */
export function computeDigestDate(scrapedAtIso) {
  const d = new Date(scrapedAtIso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type).value;

  const y = Number(get('year'));
  const m = Number(get('month'));
  const day = Number(get('day'));
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0;

  const candidate = new Date(Date.UTC(y, m - 1, day));
  if (hour >= 9) candidate.setUTCDate(candidate.getUTCDate() + 1);

  const weekday = candidate.getUTCDay(); // 0=일, 6=토
  if (weekday === 6) candidate.setUTCDate(candidate.getUTCDate() + 2);
  else if (weekday === 0) candidate.setUTCDate(candidate.getUTCDate() + 1);

  const yy = candidate.getUTCFullYear();
  const mm = String(candidate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(candidate.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** 'YYYY-MM-DD' 문자열에 일수를 더하고 다시 문자열로 (period 탭 범위 계산용) */
export function addDaysToDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

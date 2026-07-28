'use client';

import { useMemo, useState, useCallback } from 'react';
import { computeDigestDate, addDaysToDateKey } from '@/lib/digestDate';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PERIOD_TABS = [
  { key: 'today', label: '오늘' },
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
];

/** '2026-07-27' → '2026.7.27.월' */
function formatDayLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${y}.${m}.${d}.${WEEKDAYS[weekday]}`;
}

/** 예시 포맷대로 순수 텍스트 다이제스트 생성 */
function formatDigestText(dateKey, feedEntries) {
  const lines = [`□ Today's JD Times (${formatDayLabel(dateKey)})`];
  for (const [feedTitle, articles] of feedEntries) {
    lines.push(`【${feedTitle}】`);
    for (const a of articles) {
      lines.push(a.title);
      lines.push(a.link);
    }
  }
  return lines.join('\n');
}

export default function TodayNews({
  picks,
  loading,
  error,
  period,
  onPeriodChange,
  viewMode,
  onViewModeChange,
  onRemovePick,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [query, setQuery] = useState('');

  const isDateMode = DATE_RE.test(period);

  // 스크랩마다 다이제스트 날짜 부여 (서버에 이미 있으면 그대로, 없으면 옛 데이터 대비 계산)
  const picksWithDigest = useMemo(
    () => picks.map((p) => ({ ...p, digestDate: p.digest_date || computeDigestDate(p.picked_at) })),
    [picks]
  );

  // 기간(오늘/주간/월간/특정 날짜) 필터
  const periodFiltered = useMemo(() => {
    if (isDateMode) {
      return picksWithDigest.filter((p) => p.digestDate === period);
    }
    const todayDigest = computeDigestDate(new Date().toISOString());
    if (period === 'week') {
      const start = addDaysToDateKey(todayDigest, -7);
      return picksWithDigest.filter((p) => p.digestDate >= start && p.digestDate <= todayDigest);
    }
    if (period === 'month') {
      const start = addDaysToDateKey(todayDigest, -31);
      return picksWithDigest.filter((p) => p.digestDate >= start && p.digestDate <= todayDigest);
    }
    // 'today'
    return picksWithDigest.filter((p) => p.digestDate === todayDigest);
  }, [picksWithDigest, period, isDateMode]);

  // 키워드 검색 (선택된 기간 범위 안에서)
  const searched = useMemo(() => {
    if (!query.trim()) return periodFiltered;
    const q = query.trim().toLowerCase();
    return periodFiltered.filter((p) => (p.title || '').toLowerCase().includes(q));
  }, [periodFiltered, query]);

  // 다이제스트 날짜별 → 피드 이름별로 그룹핑 (최신 날짜가 위로)
  const groupedByDay = useMemo(() => {
    const byDay = new Map();
    for (const p of searched) {
      if (!byDay.has(p.digestDate)) byDay.set(p.digestDate, new Map());
      const byFeed = byDay.get(p.digestDate);
      const feedTitle = p.feed_title || p.source || '일반';
      if (!byFeed.has(feedTitle)) byFeed.set(feedTitle, []);
      byFeed.get(feedTitle).push(p);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [searched]);

  const handleRemove = useCallback(
    (articleId) => {
      onRemovePick?.(articleId);
    },
    [onRemovePick]
  );

  const handleCopy = useCallback(async (dateKey, feedMap) => {
    const text = formatDigestText(dateKey, [...feedMap.entries()]);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(dateKey);
      setTimeout(() => setCopiedKey((k) => (k === dateKey ? null : k)), 1500);
    } catch {
      // 클립보드 API를 쓸 수 없는 환경(비HTTPS 등) — 무시하고 넘어감
    }
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-6 pt-2">
        <div className="flex items-center gap-1 rounded border border-(--color-rule) p-0.5">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onPeriodChange(tab.key)}
              className={[
                'px-3 py-1 text-xs rounded cursor-pointer transition-colors',
                !isDateMode && period === tab.key
                  ? 'bg-(--color-ink) text-(--color-paper)'
                  : 'text-(--color-ink-soft) hover:text-(--color-ink)',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 날짜 지정 (달력) — 고르면 위 오늘/주간/월간 탭 대신 그 날짜만 표시 */}
        <input
          type="date"
          value={isDateMode ? period : ''}
          onChange={(e) => {
            if (e.target.value) onPeriodChange(e.target.value);
          }}
          className={[
            'rounded border px-2 py-1 text-xs cursor-pointer',
            isDateMode
              ? 'border-(--color-wire-blue) text-(--color-wire-blue) font-medium'
              : 'border-(--color-rule) text-(--color-ink-soft)',
          ].join(' ')}
        />
        {isDateMode && (
          <button
            onClick={() => onPeriodChange('today')}
            className="text-xs text-(--color-ink-faint) hover:text-(--color-ink) cursor-pointer"
          >
            날짜 지정 해제
          </button>
        )}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="스크랩한 기사 검색…"
          className="min-w-[140px] flex-1 rounded border border-(--color-rule) px-3 py-1 text-xs bg-(--color-paper-raised) focus:border-(--color-wire-blue)"
        />

        <div className="flex items-center gap-1 rounded border border-(--color-rule) p-0.5">
          <button
            onClick={() => onViewModeChange('card')}
            className={[
              'px-2.5 py-1 text-xs rounded cursor-pointer transition-colors',
              viewMode === 'card'
                ? 'bg-(--color-ink) text-(--color-paper)'
                : 'text-(--color-ink-soft) hover:text-(--color-ink)',
            ].join(' ')}
          >
            ▦ 카드
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={[
              'px-2.5 py-1 text-xs rounded cursor-pointer transition-colors',
              viewMode === 'list'
                ? 'bg-(--color-ink) text-(--color-paper)'
                : 'text-(--color-ink-soft) hover:text-(--color-ink)',
            ].join(' ')}
          >
            ☰ 리스트
          </button>
        </div>
      </div>

      <div className="px-6 py-5 max-w-3xl space-y-6">
        {loading && (
          <p className="text-sm text-(--color-ink-soft) py-10 text-center">불러오는 중…</p>
        )}

        {!loading && error && (
          <div className="rounded border border-(--color-stamp-red)/40 bg-(--color-stamp-red)/5 px-4 py-3">
            <p className="text-sm text-(--color-stamp-red)">{error}</p>
          </div>
        )}

        {!loading && !error && groupedByDay.length === 0 && (
          <div className="text-center py-16">
            <p className="font-(family-name:--font-display) text-lg mb-1">
              {query.trim() ? '검색 결과가 없습니다' : '아직 스크랩한 기사가 없습니다'}
            </p>
            {!query.trim() && (
              <p className="text-sm text-(--color-ink-soft)">
                기사 옆의 <span className="font-(family-name:--font-mono)">☐</span> 버튼을 눌러
                스크랩해보세요.
              </p>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          groupedByDay.map(([dateKey, feedMap]) => (
            <section
              key={dateKey}
              className="rounded-lg border border-(--color-rule) bg-(--color-paper-raised) overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-(--color-rule)">
                <h3 className="font-(family-name:--font-display) text-base font-bold">
                  □ Today&apos;s JD Times ({formatDayLabel(dateKey)})
                </h3>
                <button
                  onClick={() => handleCopy(dateKey, feedMap)}
                  className="shrink-0 rounded border border-(--color-rule) px-3 py-1 text-xs font-medium text-(--color-ink) hover:border-(--color-wire-blue) hover:text-(--color-wire-blue) transition-colors cursor-pointer"
                >
                  {copiedKey === dateKey ? '복사됨 ✓' : '📋 메시지로 복사'}
                </button>
              </div>

              <div className={viewMode === 'list' ? 'px-5 py-3 space-y-4' : 'px-5 py-4 space-y-5'}>
                {[...feedMap.entries()].map(([feedTitle, articles]) => (
                  <div key={feedTitle}>
                    <p className="font-(family-name:--font-sans) text-xs font-semibold text-(--color-wire-blue) mb-2">
                      【{feedTitle}】
                    </p>

                    {viewMode === 'list' ? (
                      <ul className="space-y-1.5">
                        {articles.map((a) => (
                          <li key={a.article_id} className="flex items-start gap-2 text-sm">
                            <button
                              onClick={() => handleRemove(a.article_id)}
                              aria-label="스크랩 해제"
                              className="mt-0.5 shrink-0 text-(--color-ink-faint) hover:text-(--color-stamp-red) cursor-pointer text-xs"
                            >
                              ✕
                            </button>
                            <a
                              href={a.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-w-0 truncate font-(family-name:--font-display) text-(--color-ink) hover:text-(--color-wire-blue)"
                            >
                              {a.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="space-y-3">
                        {articles.map((a) => (
                          <div key={a.article_id} className="flex items-start gap-2">
                            <button
                              onClick={() => handleRemove(a.article_id)}
                              aria-label="스크랩 해제"
                              className="mt-0.5 shrink-0 text-(--color-ink-faint) hover:text-(--color-stamp-red) cursor-pointer text-sm"
                            >
                              ✕
                            </button>
                            <div className="min-w-0">
                              <a
                                href={a.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-(family-name:--font-display) text-base font-semibold text-(--color-ink) hover:text-(--color-wire-blue) leading-snug"
                              >
                                {a.title}
                              </a>
                              <p className="mt-0.5 font-(family-name:--font-mono) text-xs text-(--color-ink-faint) truncate">
                                {a.source} · {a.link}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}

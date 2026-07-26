'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { getPicks } from '@/lib/api';

const TIME_ZONE = 'Asia/Seoul';
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const PERIOD_TABS = [
  { key: 'today', label: '오늘' },
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
];

/** Asia/Seoul 기준 'YYYY-MM-DD' 키 */
function dateKeyFor(dateInput) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateInput));
}

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

export default function TodayNews({ viewMode, onViewModeChange, onRemovePick }) {
  const [period, setPeriod] = useState('today');
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const load = useCallback(async (p) => {
    setLoading(true);
    setError('');
    try {
      const data = await getPicks(p);
      setPicks(data);
    } catch (err) {
      setError(err.message || 'Pick한 기사를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 기간 탭 변경 시 재조회
    load(period);
  }, [period, load]);

  // 날짜별 → 피드 이름별로 그룹핑 (최신 날짜가 위로)
  const groupedByDay = useMemo(() => {
    const byDay = new Map();
    for (const p of picks) {
      const dateKey = dateKeyFor(p.picked_at);
      if (!byDay.has(dateKey)) byDay.set(dateKey, new Map());
      const byFeed = byDay.get(dateKey);
      const feedTitle = p.feed_title || p.source || '일반';
      if (!byFeed.has(feedTitle)) byFeed.set(feedTitle, []);
      byFeed.get(feedTitle).push(p);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [picks]);

  const handleRemove = useCallback(
    async (articleId) => {
      setPicks((prev) => prev.filter((p) => p.article_id !== articleId));
      await onRemovePick?.(articleId);
    },
    [onRemovePick]
  );

  const handleCopy = useCallback(async (dateKey, catMap) => {
    const text = formatDigestText(dateKey, [...catMap.entries()]);
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
              onClick={() => setPeriod(tab.key)}
              className={[
                'px-3 py-1 text-xs rounded cursor-pointer transition-colors',
                period === tab.key
                  ? 'bg-(--color-ink) text-(--color-paper)'
                  : 'text-(--color-ink-soft) hover:text-(--color-ink)',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 rounded border border-(--color-rule) p-0.5">
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
              아직 담긴 기사가 없습니다
            </p>
            <p className="text-sm text-(--color-ink-soft)">
              기사 옆의 <span className="font-(family-name:--font-mono)">+</span> 버튼을 눌러
              Today News에 담아보세요.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          groupedByDay.map(([dateKey, catMap]) => (
            <section
              key={dateKey}
              className="rounded-lg border border-(--color-rule) bg-(--color-paper-raised) overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-(--color-rule)">
                <h3 className="font-(family-name:--font-display) text-base font-bold">
                  □ Today&apos;s JD Times ({formatDayLabel(dateKey)})
                </h3>
                <button
                  onClick={() => handleCopy(dateKey, catMap)}
                  className="shrink-0 rounded border border-(--color-rule) px-3 py-1 text-xs font-medium text-(--color-ink) hover:border-(--color-wire-blue) hover:text-(--color-wire-blue) transition-colors cursor-pointer"
                >
                  {copiedKey === dateKey ? '복사됨 ✓' : '📋 메시지로 복사'}
                </button>
              </div>

              <div className={viewMode === 'list' ? 'px-5 py-3 space-y-4' : 'px-5 py-4 space-y-5'}>
                {[...catMap.entries()].map(([feedTitle, articles]) => (
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
                              aria-label="Today News에서 빼기"
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
                              aria-label="Today News에서 빼기"
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

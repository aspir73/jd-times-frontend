'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { computeDigestDate, addDaysToDateKey } from '@/lib/digestDate';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Today News 다이제스트 안에서 피드 그룹이 나열되는 우선순위 (숫자가 작을수록 먼저 표시)
const FEED_PRIORITY = ['보안', 'LG전자'];

function feedPriority(feedTitle) {
  const idx = FEED_PRIORITY.indexOf(feedTitle);
  return idx === -1 ? FEED_PRIORITY.length : idx;
}

/** 피드 그룹 Map을 우선순위 규칙에 따라 정렬된 배열로 변환 (동순위는 원래 순서 유지) */
function sortFeedEntries(feedMap) {
  return [...feedMap.entries()].sort((a, b) => feedPriority(a[0]) - feedPriority(b[0]));
}

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

/** 'YYYY-MM-DD' → 그 주의 월요일 'YYYY-MM-DD' (주 단위 그룹핑 키) */
function getMondayOfWeek(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (date.getUTCDay() + 6) % 7; // 월=0 ... 일=6
  date.setUTCDate(date.getUTCDate() - dayNum);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** ISO 8601 기준 주차 번호 */
function getISOWeekNumber(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // 그 주의 목요일
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((date - firstThursday) / (7 * 24 * 60 * 60 * 1000));
}

/** 접힌 주간 카드 라벨: "Week 31, '26년 7월 28일 화요일" (대표 날짜 = 그 주 안에서 가장 최근 날짜) */
function formatWeekLabel(representativeDateKey) {
  const [y, m, d] = representativeDateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const weekNum = getISOWeekNumber(representativeDateKey);
  const yy = String(y).slice(2);
  return `Week ${weekNum}, '${yy}년 ${m}월 ${d}일 ${WEEKDAYS[weekday]}요일`;
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

/**
 * 눌러서 밀어 움직이는(Push & Drag) 방식의 순서 조정 리스트.
 * 마우스와 모바일 터치 둘 다 Pointer Events 하나로 처리한다.
 * 드래그 중인 항목을 손가락/커서 위치로 따라 움직이게 하고, 이웃 항목의 절반을
 * 넘어서는 순간 자리를 바꾼다(대부분의 정렬 가능 리스트가 쓰는 방식).
 */
function ReorderableArticles({ articles, onReorderCommit, renderItem }) {
  const [order, setOrder] = useState(articles);
  const [dragId, setDragId] = useState(null);
  const [dragY, setDragY] = useState(0);
  const orderRef = useRef(articles);
  const rowRefs = useRef(new Map());

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  // 부모 쪽 articles가 바뀌면 동기화 (드래그 중에는 건드리지 않음 — 손 놓을 때 최종본을 부모로 보냄)
  useEffect(() => {
    if (!dragId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 부모가 넘겨준 목록과 동기화하는 의도된 패턴
      setOrder(articles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dragId를 넣으면 드래그 종료 순간 order가 잠깐 되돌아가는 버그가 생김
  }, [articles]);

  const startDrag = useCallback(
    (e, articleId) => {
      e.preventDefault();
      const rowEl = rowRefs.current.get(articleId);
      const rowHeight = rowEl?.getBoundingClientRect().height || 48;
      let startY = e.clientY;
      setDragId(articleId);
      setDragY(0);

      const handleMove = (ev) => {
        const delta = ev.clientY - startY;
        setDragY(delta);
        if (Math.abs(delta) < rowHeight / 2) return;

        const dir = delta > 0 ? 1 : -1;
        setOrder((prev) => {
          const idx = prev.findIndex((a) => a.article_id === articleId);
          const targetIdx = idx + dir;
          if (idx === -1 || targetIdx < 0 || targetIdx >= prev.length) return prev;
          const next = [...prev];
          [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
          return next;
        });
        startY = ev.clientY;
        setDragY(0);
      };

      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        setDragId(null);
        setDragY(0);
        onReorderCommit(orderRef.current.map((a) => a.article_id));
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [onReorderCommit]
  );

  // eslint-disable-next-line react-hooks/refs -- 드래그 시작 시 높이 측정을 위한 콜백 ref (표준 패턴)
  return order.map((article) => {
    const isDragging = article.article_id === dragId;
    return (
      <div
        key={article.article_id}
        ref={(el) => {
          if (el) rowRefs.current.set(article.article_id, el);
          else rowRefs.current.delete(article.article_id);
        }}
        style={
          isDragging
            ? { transform: `translateY(${dragY}px)`, position: 'relative', zIndex: 20 }
            : undefined
        }
        className={isDragging ? 'opacity-90 shadow-lg bg-(--color-paper)' : undefined}
      >
        {renderItem(article, {
          onPointerDown: (e) => startDrag(e, article.article_id),
          isDragging,
        })}
      </div>
    );
  });
}

/** 드래그 손잡이 아이콘 - 누르고 위아래로 밀면 순서가 바뀜 */
function DragHandle({ onPointerDown }) {
  return (
    <span
      onPointerDown={onPointerDown}
      aria-label="눌러서 순서 조정"
      title="눌러서 위아래로 밀면 순서가 바뀝니다"
      className="mt-0.5 shrink-0 text-(--color-ink-faint) hover:text-(--color-wire-blue) cursor-grab active:cursor-grabbing select-none text-sm leading-none px-0.5"
      style={{ touchAction: 'none' }}
    >
      ⠿
    </span>
  );
}

/** 하루치 다이제스트 카드. editable=false면 삭제(✕)/순서조정 버튼을 아예 렌더링하지 않음 (확정된 과거 기록 보호) */
function DayDigestCard({ dateKey, feedEntries, viewMode, editable, isCopied, onCopy, onRemove, onReorderCommit }) {
  return (
    <section className="rounded-lg border border-(--color-rule) bg-(--color-paper-raised) overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-(--color-rule)">
        <h3 className="font-(family-name:--font-display) text-base font-bold">
          □ Today&apos;s JD Times ({formatDayLabel(dateKey)})
        </h3>
        <button
          onClick={() => onCopy(dateKey, feedEntries)}
          className="shrink-0 rounded border border-(--color-rule) px-3 py-1 text-xs font-medium text-(--color-ink) hover:border-(--color-wire-blue) hover:text-(--color-wire-blue) transition-colors cursor-pointer"
        >
          {isCopied ? '복사됨 ✓' : '📋 메시지로 복사'}
        </button>
      </div>

      <div className={viewMode === 'list' ? 'px-5 py-3 space-y-4' : 'px-5 py-4 space-y-5'}>
        {feedEntries.map(([feedTitle, articles]) => (
          <div key={feedTitle}>
            <p className="font-(family-name:--font-sans) text-xs font-semibold text-(--color-wire-blue) mb-2">
              【{feedTitle}】
            </p>

            {editable ? (
              <ReorderableArticles
                articles={articles}
                onReorderCommit={(ids) => onReorderCommit(feedTitle, ids)}
                renderItem={(a, dragProps) =>
                  viewMode === 'list' ? (
                    <div className="flex items-start gap-2 text-sm py-0.5">
                      <DragHandle onPointerDown={dragProps.onPointerDown} />
                      <button
                        onClick={() => onRemove(a.article_id)}
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
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 py-1">
                      <DragHandle onPointerDown={dragProps.onPointerDown} />
                      <button
                        onClick={() => onRemove(a.article_id)}
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
                  )
                }
              />
            ) : viewMode === 'list' ? (
              <ul className="space-y-1.5">
                {articles.map((a) => (
                  <li key={a.article_id} className="flex items-start gap-2 text-sm">
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
  );
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
  onReorderPick,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [query, setQuery] = useState('');
  const [expandedWeeks, setExpandedWeeks] = useState(new Set());

  const isDateMode = DATE_RE.test(period);

  // 오전 9시 기준으로 아직 "확정되지 않은" 현재 진행 중인 다이제스트 날짜만 삭제 가능
  const currentOpenDigestDate = computeDigestDate(new Date().toISOString());

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

  // 다이제스트 날짜별 → 피드 이름별로 그룹핑 (최신 날짜가 위로, 피드는 우선순위 순)
  const groupedByDay = useMemo(() => {
    const byDay = new Map();
    for (const p of searched) {
      if (!byDay.has(p.digestDate)) byDay.set(p.digestDate, new Map());
      const byFeed = byDay.get(p.digestDate);
      const feedTitle = p.feed_title || p.source || '일반';
      if (!byFeed.has(feedTitle)) byFeed.set(feedTitle, []);
      byFeed.get(feedTitle).push(p);
    }
    return [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, feedMap]) => [dateKey, sortFeedEntries(feedMap)]);
  }, [searched]);

  // 최상단 = 가장 최근 날짜(지금까지와 동일하게 펼쳐서 표시), 나머지는 주 단위로 묶어서 접어둠
  const topEntry = groupedByDay[0] ?? null;
  const restDays = groupedByDay.slice(1);

  const weekGroups = useMemo(() => {
    const groups = new Map(); // 그 주 월요일 날짜 -> [ [dateKey, feedEntries], ... ] (최신순)
    for (const entry of restDays) {
      const monday = getMondayOfWeek(entry[0]);
      if (!groups.has(monday)) groups.set(monday, []);
      groups.get(monday).push(entry);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [restDays]);

  const toggleWeek = useCallback((mondayKey) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(mondayKey)) next.delete(mondayKey);
      else next.add(mondayKey);
      return next;
    });
  }, []);

  const handleRemove = useCallback(
    (articleId) => {
      onRemovePick?.(articleId);
    },
    [onRemovePick]
  );

  const handleReorderCommit = useCallback(
    (feedTitle, newOrderArticleIds) => {
      onReorderPick?.(newOrderArticleIds);
    },
    [onReorderPick]
  );

  const handleCopy = useCallback(async (dateKey, feedEntries) => {
    const text = formatDigestText(dateKey, feedEntries);
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

      <div className="px-6 py-5 max-w-3xl space-y-3">
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
                기사 옆의 <span className="font-(family-name:--font-mono)">☆</span> 버튼을 눌러
                스크랩해보세요.
              </p>
            )}
          </div>
        )}

        {/* 최상단: 가장 최근 날짜 — 지금까지와 동일하게 항상 펼쳐서 표시, 오늘 것이면 삭제 가능 */}
        {!loading && !error && topEntry && (
          <DayDigestCard
            dateKey={topEntry[0]}
            feedEntries={topEntry[1]}
            viewMode={viewMode}
            editable={topEntry[0] === currentOpenDigestDate}
            isCopied={copiedKey === topEntry[0]}
            onCopy={handleCopy}
            onRemove={handleRemove}
            onReorderCommit={handleReorderCommit}
          />
        )}

        {/* 지난 주들: 주 단위로 접어서 표시, 클릭하면 펼쳐짐. 확정된 과거 기록이라 삭제 버튼 없음 */}
        {!loading &&
          !error &&
          weekGroups.map(([mondayKey, days]) => {
            const isExpanded = expandedWeeks.has(mondayKey);
            const representativeDate = days[0][0]; // 그 주 안에서 가장 최근 날짜
            return (
              <div key={mondayKey} className="rounded-lg border border-(--color-rule) overflow-hidden">
                <button
                  onClick={() => toggleWeek(mondayKey)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-(--color-paper-raised) hover:bg-(--color-rule)/30 transition-colors cursor-pointer"
                >
                  <span className="font-(family-name:--font-mono) text-sm text-(--color-ink-soft)">
                    {formatWeekLabel(representativeDate)}
                  </span>
                  <span className="text-(--color-ink-faint) text-xs">{isExpanded ? '▴ 접기' : '▾ 펼치기'}</span>
                </button>

                {isExpanded && (
                  <div className="accordion-enter px-3 pb-3 pt-1 space-y-3 bg-(--color-paper)">
                    {days.map(([dateKey, feedEntries]) => (
                      <DayDigestCard
                        key={dateKey}
                        dateKey={dateKey}
                        feedEntries={feedEntries}
                        viewMode={viewMode}
                        editable={false}
                        isCopied={copiedKey === dateKey}
                        onCopy={handleCopy}
                        onRemove={handleRemove}
            onReorderCommit={handleReorderCommit}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

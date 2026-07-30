'use client';

import { useState } from 'react';
import { RibbonIcon } from './icons';

const TIME_ZONE = 'Asia/Seoul';

/** 폴백: 서버가 pubDateDisplay를 안 내려준 옛날 캐시 데이터 대비 */
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const dateKey = new Intl.DateTimeFormat('ko-KR', { timeZone: TIME_ZONE, dateStyle: 'short' }).format(d);
  const todayKey = new Intl.DateTimeFormat('ko-KR', { timeZone: TIME_ZONE, dateStyle: 'short' }).format(new Date());
  if (dateKey === todayKey) {
    return d.toLocaleTimeString('ko-KR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('ko-KR', { timeZone: TIME_ZONE, month: '2-digit', day: '2-digit' });
}

/** 서버가 미리 계산해 내려준 한국시간 표시 문자열을 그대로 사용 */
function displayTime(article) {
  return article.pubDateDisplay || formatTime(article.pubDate);
}

function RowIcons({ article, onToggleBookmark, onTogglePick }) {
  return (
    <>
      <button
        onClick={() => onToggleBookmark(article)}
        aria-label={article.isBookmarked ? '북마크 해제' : '북마크 추가'}
        className={[
          'shrink-0 text-base leading-none cursor-pointer transition-colors p-0.5',
          article.isBookmarked
            ? 'text-(--color-stamp-red)'
            : 'text-(--color-ink-faint) hover:text-(--color-stamp-red)',
        ].join(' ')}
      >
        <RibbonIcon filled={article.isBookmarked} />
      </button>
      {onTogglePick && (
        <button
          onClick={() => onTogglePick(article)}
          aria-label={article.isPicked ? '스크랩 해제' : '스크랩하기'}
          title={article.isPicked ? '스크랩 해제' : '스크랩하기 (Today News에 담기)'}
          className={[
            'shrink-0 text-base leading-none cursor-pointer transition-colors p-0.5',
            article.isPicked
              ? 'text-(--color-signal-amber)'
              : 'text-(--color-ink-faint) hover:text-(--color-signal-amber)',
          ].join(' ')}
        >
          {article.isPicked ? '★' : '☆'}
        </button>
      )}
    </>
  );
}

export default function ClusterListItem({ cluster, onToggleRead, onToggleBookmark, onTogglePick, selected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(false);
  const { primaryArticle, relatedArticles, keyword } = cluster;
  const sourceCount = 1 + relatedArticles.length;

  return (
    <div
      className={[
        'border-b last:border-b-0 border-(--color-rule) transition-colors',
        selected ? 'bg-(--color-wire-blue)/5' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 px-3 py-2 hover:bg-(--color-rule)/30">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggleSelect(cluster)}
            aria-label="이 소식 선택"
            className="w-4 h-4 accent-(--color-wire-blue) cursor-pointer shrink-0"
          />
        )}

        <RowIcons article={primaryArticle} onToggleBookmark={onToggleBookmark} onTogglePick={onTogglePick} />

        <span className="shrink-0 hidden sm:inline-block font-(family-name:--font-sans) text-[11px] font-semibold text-(--color-wire-blue) bg-(--color-wire-blue)/10 rounded px-1.5 py-0.5 max-w-24 truncate">
          {keyword}
        </span>

        <a
          href={primaryArticle.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => !primaryArticle.isRead && onToggleRead(primaryArticle)}
          className="min-w-0 flex-1 flex items-baseline gap-2"
        >
          <span
            className={[
              'font-(family-name:--font-display) text-sm truncate',
              primaryArticle.isRead
                ? 'text-(--color-ink-soft) font-normal'
                : 'text-(--color-ink) font-semibold',
            ].join(' ')}
          >
            {primaryArticle.title}
          </span>
          <span className="shrink-0 font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint)">
            {primaryArticle.source}
          </span>
        </a>

        <span className="shrink-0 font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint)">
          {displayTime(primaryArticle)}
        </span>

        {sourceCount > 1 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 flex items-center gap-1 font-(family-name:--font-mono) text-[11px] text-(--color-wire-blue) hover:underline cursor-pointer"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-(--color-signal-amber)" />
            {sourceCount}건 확인 {expanded ? '▴' : '▾'}
          </button>
        )}
      </div>

      {expanded && sourceCount > 1 && (
        <div className="accordion-enter pl-9 pr-3 pb-2 space-y-0.5">
          {relatedArticles.map((a) => (
            <div
              key={a.articleId}
              className="flex items-center gap-3 py-1 pl-3 border-l-2 border-(--color-rule)"
            >
              <RowIcons article={a} onToggleBookmark={onToggleBookmark} onTogglePick={onTogglePick} />
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => !a.isRead && onToggleRead(a)}
                className="min-w-0 flex-1 flex items-baseline gap-2"
              >
                <span
                  className={[
                    'font-(family-name:--font-display) text-sm truncate',
                    a.isRead ? 'text-(--color-ink-soft) font-normal' : 'text-(--color-ink) font-medium',
                  ].join(' ')}
                >
                  {a.title}
                </span>
                <span className="shrink-0 font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint)">
                  {a.source}
                </span>
              </a>
              <span className="shrink-0 font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint)">
                {displayTime(a)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';

const TIME_ZONE = 'Asia/Seoul';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';

  const dateKey = new Intl.DateTimeFormat('ko-KR', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const todayKey = new Intl.DateTimeFormat('ko-KR', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  if (dateKey === todayKey) {
    return d.toLocaleTimeString('ko-KR', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return d.toLocaleDateString('ko-KR', {
    timeZone: TIME_ZONE,
    month: '2-digit',
    day: '2-digit',
  });
}

function ArticleRow({ article, variant, onToggleRead, onToggleBookmark }) {
  const isRelated = variant === 'related';
  return (
    <div
      className={[
        'group flex items-start gap-3 py-2',
        isRelated ? 'pl-5 border-l-2 border-(--color-rule)' : '',
      ].join(' ')}
    >
      <button
        onClick={() => onToggleBookmark(article)}
        aria-label={article.isBookmarked ? '북마크 해제' : '북마크 추가'}
        className={[
          'mt-0.5 shrink-0 text-base leading-none cursor-pointer transition-colors',
          article.isBookmarked
            ? 'text-(--color-stamp-red)'
            : 'text-(--color-ink-faint) hover:text-(--color-stamp-red)',
        ].join(' ')}
      >
        {article.isBookmarked ? '★' : '☆'}
      </button>

      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => !article.isRead && onToggleRead(article)}
        className="min-w-0 flex-1"
      >
        <p
          className={[
            'font-(family-name:--font-display) leading-snug',
            isRelated ? 'text-sm' : 'text-lg',
            article.isRead
              ? 'text-(--color-ink-soft) font-normal'
              : `text-(--color-ink) ${isRelated ? 'font-medium' : 'font-semibold'}`,
          ].join(' ')}
        >
          {article.title}
        </p>
        <p className="mt-1 font-(family-name:--font-mono) text-xs text-(--color-ink-faint)">
          {article.source} · {formatTime(article.pubDate)}
        </p>
        {article.isBookmarked && article.summary && (
          <p className="mt-1 text-xs text-(--color-ink-soft) leading-relaxed line-clamp-3 max-w-prose">
            {article.summary}
          </p>
        )}
      </a>
    </div>
  );
}

export default function ClusterCard({ cluster, onToggleRead, onToggleBookmark, selected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(false);
  const { primaryArticle, relatedArticles, keyword } = cluster;
  const sourceCount = 1 + relatedArticles.length;

  return (
    <article
      className={[
        'rounded-lg border px-5 py-4 shadow-[0_1px_0_rgba(28,35,46,0.04)] transition-colors',
        selected
          ? 'border-(--color-wire-blue) bg-(--color-wire-blue)/5'
          : 'border-(--color-rule) bg-(--color-paper-raised)',
      ].join(' ')}
    >
      {/* 헤더: 선택 체크박스 + 키워드 태그 + 다중소스 확인 스탬프 + 시간 */}
      <div className="flex items-center gap-3 mb-2">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggleSelect(cluster)}
            aria-label="이 소식 선택"
            className="w-4 h-4 accent-(--color-wire-blue) cursor-pointer shrink-0"
          />
        )}
        <span className="font-(family-name:--font-sans) text-xs font-semibold tracking-wide text-(--color-wire-blue) bg-(--color-wire-blue)/10 rounded px-2 py-0.5">
          {keyword}
        </span>

        {sourceCount > 1 && (
          <span
            title={`${sourceCount}개 언론사가 같은 소식을 보도했습니다`}
            className="flex items-center gap-1 font-(family-name:--font-mono) text-[11px] text-(--color-ink-soft) border border-dashed border-(--color-ink-faint) rounded-full px-2 py-0.5"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-(--color-signal-amber)" />
            {sourceCount}건 확인
          </span>
        )}

        <span className="ml-auto font-(family-name:--font-mono) text-xs text-(--color-ink-faint)">
          {formatTime(primaryArticle.pubDate)}
        </span>
      </div>

      <ArticleRow
        article={primaryArticle}
        variant="primary"
        onToggleRead={onToggleRead}
        onToggleBookmark={onToggleBookmark}
      />

      {relatedArticles.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="font-(family-name:--font-sans) text-xs text-(--color-wire-blue) hover:underline cursor-pointer py-1"
          >
            {expanded
              ? '간략히 보기 ▴'
              : `+ 유사 기사 ${relatedArticles.length}건 더보기 ▾`}
          </button>

          {expanded && (
            <div className="accordion-enter mt-1 divide-y divide-(--color-rule)/60">
              {relatedArticles.map((a) => (
                <ArticleRow
                  key={a.articleId}
                  article={a}
                  variant="related"
                  onToggleRead={onToggleRead}
                  onToggleBookmark={onToggleBookmark}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

'use client';

const TIME_ZONE = 'Asia/Seoul';

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

export default function ClusterListItem({ cluster, onToggleRead, onToggleBookmark, selected, onToggleSelect }) {
  const { primaryArticle, relatedArticles, keyword } = cluster;
  const sourceCount = 1 + relatedArticles.length;

  return (
    <div
      className={[
        'flex items-center gap-3 px-3 py-2 rounded border-b last:border-b-0 border-(--color-rule) transition-colors',
        selected ? 'bg-(--color-wire-blue)/5' : 'hover:bg-(--color-rule)/30',
      ].join(' ')}
    >
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={() => onToggleSelect(cluster)}
          aria-label="이 소식 선택"
          className="w-4 h-4 accent-(--color-wire-blue) cursor-pointer shrink-0"
        />
      )}

      <button
        onClick={() => onToggleBookmark(primaryArticle)}
        aria-label={primaryArticle.isBookmarked ? '북마크 해제' : '북마크 추가'}
        className={[
          'shrink-0 text-base leading-none cursor-pointer transition-colors',
          primaryArticle.isBookmarked
            ? 'text-(--color-stamp-red)'
            : 'text-(--color-ink-faint) hover:text-(--color-stamp-red)',
        ].join(' ')}
      >
        {primaryArticle.isBookmarked ? '★' : '☆'}
      </button>

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
          {sourceCount > 1 ? ` 외 ${sourceCount - 1}` : ''}
        </span>
      </a>

      <span className="shrink-0 font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint)">
        {formatTime(primaryArticle.pubDate)}
      </span>
    </div>
  );
}

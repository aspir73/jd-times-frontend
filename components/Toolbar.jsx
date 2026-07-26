'use client';

const TIME_ZONE = 'Asia/Seoul';

function formatUpdatedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function Toolbar({ onRefresh, refreshing, lastUpdated, viewMode, onViewModeChange, onOpenSidebar }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 pt-2">
      <button
        onClick={onOpenSidebar}
        aria-label="메뉴 열기"
        className="md:hidden text-(--color-ink) text-lg leading-none cursor-pointer mr-1"
      >
        ☰
      </button>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 rounded border border-(--color-rule) px-3 py-1.5 text-xs font-medium text-(--color-ink) hover:border-(--color-wire-blue) hover:text-(--color-wire-blue) transition-colors cursor-pointer disabled:opacity-50"
      >
        <span className={refreshing ? 'animate-spin inline-block' : 'inline-block'}>↻</span>
        {refreshing ? '새로고침 중…' : '전체 새로고침'}
      </button>

      {lastUpdated && (
        <span className="font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint)">
          마지막 업데이트 {formatUpdatedAt(lastUpdated)}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1 rounded border border-(--color-rule) p-0.5">
        <button
          onClick={() => onViewModeChange('card')}
          aria-label="카드 보기"
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
          aria-label="리스트 보기"
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
  );
}

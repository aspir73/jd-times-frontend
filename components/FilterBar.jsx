'use client';

const TABS = [
  { key: 'ALL', label: '전체' },
  { key: 'UNREAD', label: '읽지 않음' },
  { key: 'READ', label: '읽음' },
  { key: 'BOOKMARK', label: '★ 북마크' },
];

export default function FilterBar({ active, onChange, counts }) {
  return (
    <div className="flex items-center gap-1 border-b border-(--color-rule) px-6 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const count = counts?.[tab.key] ?? null;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={[
              'relative flex items-center gap-2 px-4 py-3 text-sm transition-colors cursor-pointer',
              isActive
                ? 'text-(--color-ink) font-semibold'
                : 'text-(--color-ink-soft) hover:text-(--color-ink)',
            ].join(' ')}
          >
            {tab.label}
            {count !== null && (
              <span
                className={[
                  'font-(family-name:--font-mono) text-xs rounded-full px-1.5 py-0.5 leading-none',
                  tab.key === 'UNREAD' && count > 0
                    ? 'bg-(--color-signal-amber) text-(--color-paper)'
                    : 'bg-(--color-rule) text-(--color-ink-soft)',
                ].join(' ')}
              >
                {count}
              </span>
            )}
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-(--color-ink)" />
            )}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';

function groupFeedsByCategory(feeds) {
  const map = new Map();
  for (const feed of feeds) {
    const cat = feed.category || '일반';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(feed);
  }
  return map;
}

export default function Sidebar({
  feeds,
  unreadByCategory,
  selected,
  onSelect,
  onAddFeedClick,
  onEditFeedClick,
  open,
  onClose,
}) {
  const grouped = useMemo(() => groupFeedsByCategory(feeds), [feeds]);
  const [collapsed, setCollapsed] = useState({});

  const totalUnread = Object.values(unreadByCategory || {}).reduce((a, b) => a + b, 0);

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-(--color-ink)/40 md:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={[
          'w-64 shrink-0 border-r border-(--color-rule) bg-(--color-paper-raised) h-screen',
          'fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-200',
          'md:sticky md:top-0 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="px-5 pt-6 pb-4 border-b border-(--color-rule) flex items-start justify-between">
          <div>
            <h1 className="font-(family-name:--font-display) text-xl font-bold tracking-tight text-(--color-ink)">
              JD Times
            </h1>
            <p className="font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint) mt-0.5">
              multi-source news wire
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="md:hidden text-(--color-ink-faint) hover:text-(--color-ink) cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <button
          onClick={() => { onSelect({ type: 'all' }); onClose?.(); }}
          className={[
            'w-full flex items-center justify-between rounded px-3 py-2 text-sm cursor-pointer transition-colors',
            selected.type === 'all'
              ? 'bg-(--color-ink) text-(--color-paper) font-semibold'
              : 'text-(--color-ink) hover:bg-(--color-rule)/60',
          ].join(' ')}
        >
          <span>전체 보기</span>
          {totalUnread > 0 && (
            <span className="font-(family-name:--font-mono) text-[11px] text-(--color-signal-amber)">
              {totalUnread}
            </span>
          )}
        </button>

        <div className="mt-4 space-y-1">
          {[...grouped.entries()].map(([category, categoryFeeds]) => {
            const isCollapsed = collapsed[category];
            const isSelectedCategory =
              selected.type === 'category' && selected.value === category;
            const unread = unreadByCategory?.[category] || 0;

            return (
              <div key={category}>
                <div className="flex items-center">
                  <button
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [category]: !c[category] }))
                    }
                    aria-label={isCollapsed ? '펼치기' : '접기'}
                    className="w-5 shrink-0 text-(--color-ink-faint) hover:text-(--color-ink) cursor-pointer text-xs"
                  >
                    {isCollapsed ? '▸' : '▾'}
                  </button>
                  <button
                    onClick={() => { onSelect({ type: 'category', value: category }); onClose?.(); }}
                    className={[
                      'flex-1 flex items-center justify-between rounded px-2 py-1.5 text-sm cursor-pointer transition-colors',
                      isSelectedCategory
                        ? 'bg-(--color-ink) text-(--color-paper) font-semibold'
                        : 'text-(--color-ink) hover:bg-(--color-rule)/60',
                    ].join(' ')}
                  >
                    <span>{category}</span>
                    {unread > 0 && (
                      <span
                        className={[
                          'font-(family-name:--font-mono) text-[11px] rounded-full px-1.5',
                          isSelectedCategory
                            ? 'text-(--color-paper)'
                            : 'text-(--color-signal-amber)',
                        ].join(' ')}
                      >
                        {unread}
                      </span>
                    )}
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="ml-5 border-l border-(--color-rule) pl-2 mt-0.5 space-y-0.5">
                    {categoryFeeds.map((feed) => {
                      const isSelectedFeed =
                        selected.type === 'feed' && selected.value === feed.id;
                      return (
                        <div key={feed.id} className="group flex items-center">
                          <button
                            onClick={() => { onSelect({ type: 'feed', value: feed.id }); onClose?.(); }}
                            className={[
                              'flex-1 min-w-0 text-left rounded px-2 py-1 text-xs truncate cursor-pointer transition-colors',
                              isSelectedFeed
                                ? 'text-(--color-wire-blue) font-semibold'
                                : 'text-(--color-ink-soft) hover:text-(--color-ink)',
                            ].join(' ')}
                            title={feed.title}
                          >
                            · {feed.title}
                          </button>
                          <button
                            onClick={() => onEditFeedClick(feed)}
                            aria-label={`${feed.title} 피드 관리`}
                            className="shrink-0 px-1.5 text-(--color-ink-faint) opacity-0 group-hover:opacity-100 hover:text-(--color-wire-blue) cursor-pointer text-xs transition-opacity"
                          >
                            ✎
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-(--color-rule)">
        <button
          onClick={onAddFeedClick}
          className="w-full rounded border border-(--color-ink) text-(--color-ink) text-sm py-2 font-medium hover:bg-(--color-ink) hover:text-(--color-paper) transition-colors cursor-pointer"
        >
          + 피드 추가
        </button>
      </div>
      </aside>
    </>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

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
  unreadByFeed,
  selected,
  onSelect,
  onAddFeedClick,
  onManageFeedsClick,
  onEditFeedClick,
  open,
  onClose,
  pageMode,
  onSelectToday,
  pickedCount,
}) {
  const { user, logout } = useAuth() || {};
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
          'w-64 shrink-0 border-r border-(--color-rule) bg-(--color-paper-raised)',
          'fixed left-0 z-40 flex flex-col transition-transform duration-200',
          'md:sticky md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        // PC 앱의 커스텀 제목 표시줄이 있으면 그 아래부터 화면 끝까지 (없으면 --titlebar-h는 0)
        style={{ top: 'var(--titlebar-h)', height: 'calc(100dvh - var(--titlebar-h))' }}
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
        {onSelectToday && (
          <button
            onClick={() => { onSelectToday(); onClose?.(); }}
            className={[
              'w-full flex items-center justify-between rounded px-3 py-2 text-sm cursor-pointer transition-colors mb-1',
              pageMode === 'today'
                ? 'bg-(--color-signal-amber) text-(--color-paper) font-semibold'
                : 'text-(--color-ink) hover:bg-(--color-rule)/60',
            ].join(' ')}
          >
            <span>🗞 Today News</span>
            {pickedCount > 0 && (
              <span className="font-(family-name:--font-mono) text-[11px]">{pickedCount}</span>
            )}
          </button>
        )}

        <button
          onClick={() => { onSelect({ type: 'all' }); onClose?.(); }}
          className={[
            'w-full flex items-center justify-between rounded px-3 py-2 text-sm cursor-pointer transition-colors',
            pageMode !== 'today' && selected.type === 'all'
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

        <div className="mt-5 mb-1 flex items-center justify-between px-1">
          <span className="font-(family-name:--font-mono) text-[10px] font-semibold uppercase tracking-wider text-(--color-ink-faint)">
            구독 피드 {feeds.length > 0 && feeds.length}
          </span>
          {feeds.length > 0 && (
            <button
              onClick={() => { onManageFeedsClick(); onClose?.(); }}
              className="rounded px-1.5 py-0.5 text-[11px] text-(--color-wire-blue) hover:bg-(--color-wire-blue)/10 cursor-pointer"
            >
              편집
            </button>
          )}
        </div>
        <div className="space-y-1">
          {[...grouped.entries()].map(([category, categoryFeeds]) => {
            const isCollapsed = collapsed[category];
            const isSelectedCategory =
              pageMode !== 'today' && selected.type === 'category' && selected.value === category;
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
                        pageMode !== 'today' && selected.type === 'feed' && selected.value === feed.id;
                      const feedUnread = unreadByFeed?.[feed.id] || 0;
                      return (
                        <div key={feed.id} className="group flex items-center">
                          <button
                            onClick={() => { onSelect({ type: 'feed', value: feed.id }); onClose?.(); }}
                            className={[
                              'flex-1 min-w-0 flex items-center justify-between rounded px-2 py-1 text-xs cursor-pointer transition-colors',
                              isSelectedFeed
                                ? 'text-(--color-wire-blue) font-semibold'
                                : 'text-(--color-ink-soft) hover:text-(--color-ink)',
                            ].join(' ')}
                            title={feed.title}
                          >
                            <span className="truncate">· {feed.title}</span>
                            {feedUnread > 0 && (
                              <span className="shrink-0 font-(family-name:--font-mono) text-[10px] text-(--color-signal-amber) ml-1">
                                {feedUnread}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => { onEditFeedClick(feed); onClose?.(); }}
                            aria-label={`${feed.title} 피드 편집`}
                            title="피드 편집"
                            // 마우스 환경에선 마우스를 올렸을 때만, 터치 환경(hover 없음)에선 항상 보이게
                            className="shrink-0 px-1.5 py-1 text-(--color-ink-faint) opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-70 hover:text-(--color-wire-blue) cursor-pointer text-xs transition-opacity"
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

      <div className="p-3 border-t border-(--color-rule) space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { onAddFeedClick(); onClose?.(); }}
            className="rounded border border-(--color-ink) bg-(--color-ink) text-(--color-paper) text-sm py-2 font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            + 피드 추가
          </button>
          <button
            onClick={() => { onManageFeedsClick(); onClose?.(); }}
            className="rounded border border-(--color-ink) text-(--color-ink) text-sm py-2 font-medium hover:bg-(--color-ink) hover:text-(--color-paper) transition-colors cursor-pointer"
          >
            ⚙ 피드 관리
          </button>
        </div>

        {user && (
          <div className="flex items-center gap-2 px-1">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element -- Google 프로필 사진(외부 도메인)이라 next/image 설정 없이 그대로 표시
              <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full shrink-0" />
            ) : (
              <span className="h-7 w-7 rounded-full shrink-0 bg-(--color-ink) text-(--color-paper) text-xs flex items-center justify-center">
                {(user.name || user.email || '?').slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{user.name || user.email}</p>
              <div className="flex gap-2 text-[11px]">
                {user.role === 'admin' && (
                  <Link href="/admin" className="text-(--color-wire-blue) hover:underline">
                    어드민
                  </Link>
                )}
                <button onClick={logout} className="text-(--color-ink-faint) hover:text-(--color-ink) cursor-pointer">
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </aside>
    </>
  );
}

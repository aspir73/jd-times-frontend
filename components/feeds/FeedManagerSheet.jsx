'use client';

import { useMemo, useState } from 'react';
import Sheet from './Sheet';
import FeedAddSheet from './FeedAddSheet';
import FeedEditSheet from './FeedEditSheet';
import { KeywordSummary } from './KeywordEditor';
import { getFeedKind, getFeedQuery, getFeedTerms, groupByCategory } from './feedInfo';

const KIND_BADGE = {
  keyword: 'border-(--color-wire-blue)/40 text-(--color-wire-blue)',
  media: 'border-(--color-signal-amber)/50 text-(--color-signal-amber)',
  rss: 'border-(--color-rule) text-(--color-ink-soft)',
};

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * "피드 관리" 허브: 구독 중인 피드를 카테고리별로 한눈에 보고, 눌러서 편집하거나 새로 추가한다.
 * 목록 → 편집/추가 화면은 같은 창 안에서 전환되고, 뒤로 버튼(또는 Esc)으로 목록에 돌아온다.
 *
 * initialView: 'list' | 'add' | { edit: feedId } — 사이드바의 ✎나 "+ 피드 추가"에서 바로 해당 화면으로 열 때 사용
 */
export default function FeedManagerSheet({ feeds, unreadByFeed, initialView = 'list', onCreate, onUpdate, onDelete, onClose }) {
  const [view, setView] = useState(initialView);
  const [filter, setFilter] = useState('');

  const categories = useMemo(() => [...new Set(feeds.map((f) => f.category).filter(Boolean))], [feeds]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return feeds;
    return feeds.filter((f) =>
      [f.title, f.category, getFeedQuery(f), f.rss_url].some((v) => v && v.toLowerCase().includes(q))
    );
  }, [feeds, filter]);
  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  const backToList = () => setView('list');

  if (view === 'add') {
    return (
      <FeedAddSheet
        onSubmit={onCreate}
        categories={categories}
        feeds={feeds}
        onClose={onClose}
        onBack={backToList}
      />
    );
  }

  if (view?.edit !== undefined) {
    const feed = feeds.find((f) => f.id === view.edit);
    if (feed) {
      return (
        <FeedEditSheet
          key={feed.id}
          feed={feed}
          categories={categories}
          onSave={onUpdate}
          onDelete={onDelete}
          onClose={onClose}
          onBack={backToList}
        />
      );
    }
  }

  return (
    <Sheet
      title="피드 관리"
      subtitle={`${feeds.length}개 구독 중 · 눌러서 편집`}
      onClose={onClose}
      wide
      headerAction={
        <button
          type="button"
          onClick={() => setView('add')}
          className="shrink-0 rounded bg-(--color-ink) text-(--color-paper) px-3 py-1.5 text-sm font-medium hover:opacity-90 cursor-pointer"
        >
          + 추가
        </button>
      }
    >
      {feeds.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="font-(family-name:--font-display) text-lg mb-1">아직 구독 중인 피드가 없습니다</p>
          <p className="text-sm text-(--color-ink-soft) mb-4">관심 키워드나 언론사를 추가해보세요.</p>
          <button
            type="button"
            onClick={() => setView('add')}
            className="rounded bg-(--color-ink) text-(--color-paper) px-4 py-2 text-sm cursor-pointer"
          >
            + 첫 피드 추가하기
          </button>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-5">
          {feeds.length > 4 && (
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="피드 이름·키워드·카테고리로 찾기"
              className="w-full rounded border border-(--color-rule) px-3 py-2 text-base sm:text-sm bg-(--color-paper) focus:border-(--color-wire-blue) outline-none"
            />
          )}

          {filtered.length === 0 && (
            <p className="text-sm text-(--color-ink-soft) text-center py-6">&ldquo;{filter}&rdquo;에 맞는 피드가 없습니다.</p>
          )}

          {[...grouped.entries()].map(([category, list]) => (
            <section key={category}>
              <h3 className="flex items-baseline gap-2 mb-2">
                <span className="font-(family-name:--font-display) text-sm font-semibold">{category}</span>
                <span className="font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint)">{list.length}</span>
              </h3>
              <ul className="rounded-lg border border-(--color-rule) bg-(--color-paper) divide-y divide-(--color-rule) overflow-hidden">
                {list.map((feed) => {
                  const kind = getFeedKind(feed);
                  const unread = unreadByFeed?.[feed.id] || 0;
                  return (
                    <li key={feed.id}>
                      <button
                        type="button"
                        onClick={() => setView({ edit: feed.id })}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-(--color-paper-raised) cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">{feed.title}</span>
                            <span className={`shrink-0 rounded border px-1.5 text-[10px] leading-4 ${KIND_BADGE[kind.key]}`}>
                              {kind.label}
                            </span>
                            {unread > 0 && (
                              <span className="shrink-0 font-(family-name:--font-mono) text-[10px] text-(--color-signal-amber)">
                                {unread} 안읽음
                              </span>
                            )}
                          </div>
                          {kind.key === 'keyword' ? (
                            <KeywordSummary terms={getFeedTerms(feed)} />
                          ) : (
                            <p className="text-[11px] text-(--color-ink-faint) truncate font-(family-name:--font-mono)">
                              {hostOf(feed.rss_url)}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-(--color-ink-faint)" aria-hidden="true">›</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <p className="text-[11px] text-(--color-ink-faint) text-center">
            파란 칩 = 모두 포함 · 점선 칩 = 하나라도 포함 · 빨간 칩 = 제외
          </p>
        </div>
      )}
    </Sheet>
  );
}

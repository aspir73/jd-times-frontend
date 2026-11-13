'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AddFeedModal from '@/components/AddFeedModal';
import EditFeedModal from '@/components/EditFeedModal';
import { createAdminUserFeed, deleteAdminUserFeed, getAdminUserFeeds, updateAdminUserFeed } from '@/lib/api';
import { buttonClass, primaryButtonClass } from './adminUtils';

/** 어드민이 특정 사용자의 관심 RSS(구독 피드)를 대신 추가/수정/삭제 */
export default function UserFeedsPanel({ user, onClose, onChanged }) {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setFeeds(await getAdminUserFeeds(user.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 선택한 사용자가 바뀔 때마다 그 사용자의 피드 조회
    load();
  }, [load]);

  const afterChange = async () => {
    await load();
    onChanged?.();
  };

  const categories = useMemo(() => [...new Set(feeds.map((f) => f.category).filter(Boolean))], [feeds]);

  return (
    <div className="rounded-lg border border-(--color-rule) bg-(--color-paper-raised)">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-(--color-rule)">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{user.name || user.email || `사용자 ${user.id}`}의 관심 RSS</h3>
          <p className="text-[11px] text-(--color-ink-faint)">{feeds.length}개 구독 중 · 이름/카테고리는 이 사용자에게만 적용됩니다</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setAdding(true)} className={primaryButtonClass}>
            + 피드 추가
          </button>
          <button onClick={onClose} className={buttonClass} aria-label="닫기">
            ✕
          </button>
        </div>
      </div>

      {error && <p className="px-4 py-3 text-xs text-(--color-stamp-red)">{error}</p>}
      {loading ? (
        <p className="px-4 py-6 text-sm text-(--color-ink-soft) text-center">불러오는 중…</p>
      ) : feeds.length === 0 ? (
        <p className="px-4 py-6 text-sm text-(--color-ink-soft) text-center">구독 중인 피드가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-(--color-rule)">
          {feeds.map((feed) => (
            <li key={feed.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {feed.title}
                  <span className="ml-2 font-(family-name:--font-mono) text-[11px] font-normal text-(--color-ink-faint)">
                    {feed.category}
                  </span>
                </p>
                <p className="text-[11px] text-(--color-ink-faint) truncate font-(family-name:--font-mono)">
                  {feed.keyword ? `검색식: ${feed.keyword}` : feed.rss_url}
                </p>
              </div>
              <button onClick={() => setEditing(feed)} className={buttonClass}>
                편집
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddFeedModal
        open={adding}
        onClose={() => setAdding(false)}
        onSubmit={async (payload) => {
          await createAdminUserFeed(user.id, payload);
          await afterChange();
        }}
        existingCategories={categories}
        feeds={feeds}
      />
      <EditFeedModal
        key={editing?.id ?? 'none'}
        feed={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSave={async (feedId, payload) => {
          await updateAdminUserFeed(user.id, feedId, payload);
          await afterChange();
        }}
        onDelete={async (feedId) => {
          await deleteAdminUserFeed(user.id, feedId);
          await afterChange();
        }}
      />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { assignAdminFeed, deleteAdminFeed, getAdminFeeds, getAdminUsers } from '@/lib/api';
import { buttonClass, formatRelative, primaryButtonClass } from './adminUtils';

const TYPE_LABELS = { GOOGLE_KEYWORD: '구글 키워드', MEDIA_PRESET: '언론사', CUSTOM: '직접 입력' };

function FetchStatus({ feed }) {
  if (feed.subscriber_count === 0) return <span className="text-[11px] text-(--color-ink-faint)">수집 안 함 (구독자 없음)</span>;
  if (feed.last_fetch_at == null) return <span className="text-[11px] text-(--color-ink-faint)">다음 정기 수집 대기</span>;
  if (feed.last_fetch_ok) {
    return (
      <span className="text-[11px] text-(--color-ink-soft) whitespace-nowrap">
        <span className="text-(--color-wire-blue)">● 정상</span> · {feed.last_item_count}건 · {formatRelative(feed.last_fetch_at)}
      </span>
    );
  }
  return (
    <span className="text-[11px] text-(--color-stamp-red)" title={feed.last_fetch_error || ''}>
      ▲ 실패 · {formatRelative(feed.last_fetch_at)}
    </span>
  );
}

/** 피드를 사용자들에게 배포하는 모달 */
function AssignModal({ feed, users, onClose, onDone }) {
  const activeUsers = users.filter((u) => u.status === 'active');
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async (payload) => {
    setBusy(true);
    setError('');
    try {
      const { added } = await assignAdminFeed(feed.id, payload);
      onDone(added);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink)/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] flex flex-col rounded-lg bg-(--color-paper-raised) border border-(--color-rule) shadow-xl"
      >
        <div className="px-5 py-4 border-b border-(--color-rule)">
          <h2 className="font-(family-name:--font-display) text-lg font-semibold">사용자에게 배포</h2>
          <p className="text-xs text-(--color-ink-soft) mt-0.5">
            &ldquo;{feed.title}&rdquo; 피드를 선택한 사용자의 관심 RSS에 추가합니다. 이미 구독 중인 사용자는 건너뜁니다.
          </p>
        </div>
        <ul className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-(--color-rule)">
          {activeUsers.map((u) => (
            <li key={u.id}>
              <label className="flex items-center gap-3 py-2 cursor-pointer">
                <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                <span className="text-sm">{u.name || '(이름 없음)'}</span>
                <span className="text-[11px] text-(--color-ink-faint) font-(family-name:--font-mono) truncate">{u.email}</span>
              </label>
            </li>
          ))}
        </ul>
        {error && <p className="px-5 text-xs text-(--color-stamp-red)">{error}</p>}
        <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-(--color-rule)">
          <button onClick={onClose} className={buttonClass}>
            취소
          </button>
          <div className="flex-1" />
          <button onClick={() => submit({ allActive: true })} disabled={busy} className={buttonClass}>
            모든 활성 사용자 ({activeUsers.length})
          </button>
          <button
            onClick={() => submit({ userIds: [...selected] })}
            disabled={busy || selected.size === 0}
            className={primaryButtonClass}
          >
            선택한 {selected.size}명에게 배포
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeedsPanel() {
  const [feeds, setFeeds] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [onlyFailing, setOnlyFailing] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [feedList, userList] = await Promise.all([getAdminFeeds(), getAdminUsers()]);
      setFeeds(feedList);
      setUsers(userList);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 탭 진입 시 피드 카탈로그 조회
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feeds.filter((f) => {
      if (onlyFailing && !(f.subscriber_count > 0 && f.last_fetch_ok === 0)) return false;
      if (!q) return true;
      return [f.title, f.keyword, f.rss_url, f.subscribers].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [feeds, query, onlyFailing]);

  const failingCount = feeds.filter((f) => f.subscriber_count > 0 && f.last_fetch_ok === 0).length;

  const handleDelete = async (feed) => {
    const msg =
      feed.subscriber_count > 0
        ? `"${feed.title}" 피드를 삭제하면 구독 중인 ${feed.subscriber_count}명의 관심 RSS에서도 사라집니다. 삭제할까요?`
        : `"${feed.title}" 피드를 카탈로그에서 삭제할까요?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteAdminFeed(feed.id);
      setNotice(`"${feed.title}" 피드를 삭제했습니다.`);
      await load();
    } catch (err) {
      window.alert(err.message);
    }
  };

  if (loading) return <p className="text-sm text-(--color-ink-soft) py-10 text-center">피드 목록을 불러오는 중…</p>;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-(--color-stamp-red)">{error}</p>}
      {notice && (
        <p className="rounded border border-(--color-wire-blue)/30 bg-(--color-wire-blue)/5 px-3 py-2 text-xs text-(--color-wire-blue)">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="피드 이름, 키워드, 주소, 구독자 검색"
          className="flex-1 min-w-[200px] rounded border border-(--color-rule) px-3 py-1.5 text-sm bg-(--color-paper-raised)"
        />
        <label className="flex items-center gap-1.5 text-xs text-(--color-ink-soft) cursor-pointer">
          <input type="checkbox" checked={onlyFailing} onChange={(e) => setOnlyFailing(e.target.checked)} />
          수집 실패만 ({failingCount})
        </label>
        <span className="text-xs text-(--color-ink-faint) font-(family-name:--font-mono)">{visible.length} / {feeds.length}</span>
      </div>

      <div className="rounded-lg border border-(--color-rule) bg-(--color-paper-raised) overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-(--color-ink-faint) border-b border-(--color-rule)">
              <th className="px-4 py-2 font-medium">피드</th>
              <th className="px-3 py-2 font-medium">구독자</th>
              <th className="px-3 py-2 font-medium">마지막 수집</th>
              <th className="px-3 py-2 font-medium text-right">기사</th>
              <th className="px-4 py-2 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((f) => (
              <tr key={f.id} className="border-b border-(--color-rule) last:border-0 align-top">
                <td className="px-4 py-2.5 max-w-[320px]">
                  <p className="font-medium truncate">
                    {f.title}
                    <span className="ml-2 text-[11px] font-normal text-(--color-ink-faint)">{TYPE_LABELS[f.type] || f.type}</span>
                  </p>
                  <p className="text-[11px] text-(--color-ink-faint) font-(family-name:--font-mono) truncate" title={f.rss_url}>
                    {f.keyword ? `검색식: ${f.keyword}` : f.rss_url}
                  </p>
                </td>
                <td className="px-3 py-2.5 max-w-[200px]">
                  <p className="font-(family-name:--font-mono)">{f.subscriber_count}명</p>
                  {f.subscribers && <p className="text-[11px] text-(--color-ink-faint) truncate" title={f.subscribers}>{f.subscribers}</p>}
                </td>
                <td className="px-3 py-2.5">
                  <FetchStatus feed={f} />
                </td>
                <td className="px-3 py-2.5 text-right font-(family-name:--font-mono)">{f.article_count.toLocaleString('ko-KR')}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1.5 whitespace-nowrap">
                    <button onClick={() => setAssigning(f)} className={buttonClass}>
                      배포
                    </button>
                    <button onClick={() => handleDelete(f)} className={`${buttonClass} text-(--color-stamp-red)!`}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-(--color-ink-soft)">
                  해당하는 피드가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {assigning && (
        <AssignModal
          feed={assigning}
          users={users}
          onClose={() => setAssigning(null)}
          onDone={async (added) => {
            setNotice(`"${assigning.title}" 피드를 ${added}명에게 새로 배포했습니다.`);
            setAssigning(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

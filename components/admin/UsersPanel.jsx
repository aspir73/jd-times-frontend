'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAdminUsers, updateAdminUser } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import UserFeedsPanel from './UserFeedsPanel';
import { buttonClass, formatDate, formatRelative, STATUS_LABELS, STATUS_STYLES } from './adminUtils';

const FILTERS = [
  { key: 'ALL', label: '전체' },
  { key: 'pending', label: '승인 대기' },
  { key: 'active', label: '활성' },
  { key: 'suspended', label: '정지' },
];

export default function UsersPanel() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    try {
      setUsers(await getAdminUsers());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 탭 진입 시 사용자 목록 조회
    load();
  }, [load]);

  const change = async (target, payload, confirmMessage) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusyId(target.id);
    try {
      await updateAdminUser(target.id, payload);
      await load();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const visible = filter === 'ALL' ? users : users.filter((u) => u.status === filter);
  const selectedUser = users.find((u) => u.id === selectedId);

  if (loading) return <p className="text-sm text-(--color-ink-soft) py-10 text-center">사용자 목록을 불러오는 중…</p>;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-(--color-stamp-red)">{error}</p>}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={[
              'rounded-full px-3 py-1 text-xs cursor-pointer border',
              filter === f.key
                ? 'bg-(--color-ink) text-(--color-paper) border-(--color-ink)'
                : 'border-(--color-rule) text-(--color-ink-soft) hover:bg-(--color-ink)/5',
            ].join(' ')}
          >
            {f.label}
            {f.key === 'pending' && pendingCount > 0 && <span className="ml-1 font-semibold">{pendingCount}</span>}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-(--color-rule) bg-(--color-paper-raised) overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-(--color-ink-faint) border-b border-(--color-rule)">
              <th className="px-4 py-2 font-medium">사용자</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium text-right">피드</th>
              <th className="px-3 py-2 font-medium text-right">스크랩</th>
              <th className="px-3 py-2 font-medium">가입</th>
              <th className="px-3 py-2 font-medium">최근 접속</th>
              <th className="px-4 py-2 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => {
              const isMe = u.id === me?.id;
              const busy = busyId === u.id;
              return (
                <tr
                  key={u.id}
                  className={[
                    'border-b border-(--color-rule) last:border-0',
                    selectedId === u.id ? 'bg-(--color-wire-blue)/5' : '',
                  ].join(' ')}
                >
                  <td className="px-4 py-2.5">
                    <p className="font-medium whitespace-nowrap">
                      {u.name || '(이름 없음)'}
                      {u.role === 'admin' && (
                        <span className="ml-1.5 rounded bg-(--color-ink) px-1.5 py-px text-[10px] text-(--color-paper)">어드민</span>
                      )}
                      {isMe && <span className="ml-1 text-[11px] text-(--color-ink-faint)">(나)</span>}
                    </p>
                    <p className="text-[11px] text-(--color-ink-faint) font-(family-name:--font-mono)">{u.email || '아직 로그인 전'}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[11px] ${STATUS_STYLES[u.status] || ''}`}>
                      {STATUS_LABELS[u.status] || u.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-(family-name:--font-mono)">{u.feed_count}</td>
                  <td className="px-3 py-2.5 text-right font-(family-name:--font-mono)">{u.pick_count}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-(--color-ink-soft)">{formatDate(u.created_at)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-(--color-ink-soft)">{formatRelative(u.last_seen_at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedId(selectedId === u.id ? null : u.id)}
                        className={buttonClass}
                      >
                        피드 관리
                      </button>
                      {!isMe && u.status !== 'active' && (
                        <button
                          onClick={() => change(u, { status: 'active' })}
                          disabled={busy}
                          className="rounded bg-(--color-wire-blue) text-white px-2.5 py-1 text-xs cursor-pointer disabled:opacity-50"
                        >
                          {u.status === 'pending' ? '승인' : '정지 해제'}
                        </button>
                      )}
                      {!isMe && u.status !== 'suspended' && (
                        <button
                          onClick={() =>
                            change(
                              u,
                              { status: 'suspended' },
                              u.status === 'pending'
                                ? `${u.name || u.email}님의 가입을 거절(정지)할까요?`
                                : `${u.name || u.email}님의 이용을 정지할까요? 즉시 로그아웃됩니다.`
                            )
                          }
                          disabled={busy}
                          className={`${buttonClass} text-(--color-stamp-red)!`}
                        >
                          {u.status === 'pending' ? '거절' : '정지'}
                        </button>
                      )}
                      {!isMe && u.status === 'active' && (
                        <button
                          onClick={() =>
                            change(
                              u,
                              { role: u.role === 'admin' ? 'user' : 'admin' },
                              u.role === 'admin'
                                ? `${u.name || u.email}님의 어드민 권한을 해제할까요?`
                                : `${u.name || u.email}님에게 어드민 권한을 줄까요? 모든 사용자와 피드를 관리할 수 있게 됩니다.`
                            )
                          }
                          disabled={busy}
                          className={buttonClass}
                        >
                          {u.role === 'admin' ? '어드민 해제' : '어드민 지정'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-(--color-ink-soft)">
                  해당하는 사용자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserFeedsPanel key={selectedUser.id} user={selectedUser} onClose={() => setSelectedId(null)} onChanged={load} />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import StatsPanel from '@/components/admin/StatsPanel';
import UsersPanel from '@/components/admin/UsersPanel';
import FeedsPanel from '@/components/admin/FeedsPanel';

const TABS = [
  { key: 'stats', label: '사용 통계' },
  { key: 'users', label: '사용자 · 관심 RSS' },
  { key: 'feeds', label: '전체 피드 현황' },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('users');

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-(--color-ink-soft)">어드민만 볼 수 있는 페이지입니다.</p>
        <Link href="/" className="text-sm text-(--color-wire-blue) underline">
          JD Times로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-(--color-rule) bg-(--color-paper-raised)">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <Link href="/" className="font-(family-name:--font-display) text-xl font-bold tracking-tight">
              JD Times
            </Link>
            <span className="font-(family-name:--font-mono) text-xs text-(--color-stamp-red)">ADMIN</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline text-(--color-ink-soft) truncate">{user.email}</span>
            <Link href="/" className="text-(--color-wire-blue) hover:underline">
              뉴스 보기
            </Link>
            <button onClick={logout} className="text-(--color-ink-faint) hover:text-(--color-ink) cursor-pointer">
              로그아웃
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'whitespace-nowrap px-3 py-2 text-sm border-b-2 -mb-px cursor-pointer',
                tab === t.key
                  ? 'border-(--color-ink) font-semibold text-(--color-ink)'
                  : 'border-transparent text-(--color-ink-soft) hover:text-(--color-ink)',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {tab === 'stats' && <StatsPanel />}
        {tab === 'users' && <UsersPanel />}
        {tab === 'feeds' && <FeedsPanel />}
      </main>
    </div>
  );
}

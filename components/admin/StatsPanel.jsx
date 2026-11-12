'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminStats } from '@/lib/api';

const DAYS = 30;

/** 최근 30일(KST) 날짜 목록 — 데이터가 없는 날도 0으로 채워 막대 간격이 시간에 비례하게 */
function lastDaysKst(n) {
  const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(todayKst);
    d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-(--color-rule) bg-(--color-paper-raised) px-4 py-3">
      <p className="text-xs text-(--color-ink-soft)">{label}</p>
      <p className="font-(family-name:--font-display) text-2xl font-bold mt-0.5">{value.toLocaleString('ko-KR')}</p>
      {sub && <p className="text-[11px] text-(--color-ink-faint) mt-0.5">{sub}</p>}
    </div>
  );
}

/**
 * 일별 막대 차트 (단일 시리즈라 범례 없이 제목이 시리즈를 밝힘).
 * 막대: 위쪽만 4px 둥글게, 막대 사이 2px 간격, 기준선 고정. 막대 열 전체가 호버 영역이고 툴팁에 날짜·값 표시.
 * "표로 보기"로 같은 데이터를 표로도 볼 수 있다.
 */
function DailyBarChart({ title, unit, series }) {
  const [hover, setHover] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const days = useMemo(() => lastDaysKst(DAYS), []);
  const data = useMemo(() => {
    const byDay = new Map(series.map((s) => [s.day, s.count]));
    return days.map((day) => ({ day, count: byDay.get(day) ?? 0 }));
  }, [days, series]);

  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  const shortDay = (day) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

  return (
    <div className="rounded-lg border border-(--color-rule) bg-(--color-paper-raised) px-4 py-3">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[11px] text-(--color-ink-faint)">최근 {DAYS}일 · 합계 {total.toLocaleString('ko-KR')}{unit}</p>
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="text-[11px] text-(--color-wire-blue) hover:underline cursor-pointer"
        >
          {showTable ? '차트로 보기' : '표로 보기'}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-48 overflow-y-auto text-xs">
          <table className="w-full">
            <thead>
              <tr className="text-(--color-ink-faint)">
                <th className="text-left font-medium py-1">날짜</th>
                <th className="text-right font-medium py-1">{title}</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.day} className="border-t border-(--color-rule)">
                  <td className="py-1 font-(family-name:--font-mono)">{d.day}</td>
                  <td className="py-1 text-right font-(family-name:--font-mono)">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-end h-36 border-b border-(--color-ink-faint)/60" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <div
                key={d.day}
                className="relative flex-1 h-full flex items-end px-px cursor-default"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${d.day} ${d.count}${unit}`}
              >
                {hover === i && <div className="absolute inset-0 bg-(--color-ink)/5" />}
                <div
                  className="relative w-full rounded-t-[4px] bg-(--color-wire-blue)"
                  style={{ height: d.count > 0 ? `${Math.max(2, (d.count / max) * 100)}%` : 0 }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-(--color-ink-faint) font-(family-name:--font-mono)">
            <span>{shortDay(data[0].day)}</span>
            <span>{shortDay(data[Math.floor(DAYS / 2)].day)}</span>
            <span>{shortDay(data[DAYS - 1].day)}</span>
          </div>
          <span className="absolute -top-1 left-0 text-[10px] text-(--color-ink-faint) font-(family-name:--font-mono)">
            최대 {max}
          </span>
          {hover !== null && (
            <div
              className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 whitespace-nowrap rounded border border-(--color-rule) bg-(--color-paper) px-2 py-1 text-[11px] shadow-sm"
              style={{ left: `${((hover + 0.5) / DAYS) * 100}%` }}
            >
              <span className="text-(--color-ink-soft)">{data[hover].day}</span>{' '}
              <span className="font-semibold">{data[hover].count}{unit}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStats().then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-(--color-stamp-red)">{error}</p>;
  if (!stats) return <p className="text-sm text-(--color-ink-soft) py-10 text-center">통계를 불러오는 중…</p>;

  const { users, feeds, subscriptions, articles, picks } = stats;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="전체 사용자" value={users.total} sub={`활성 ${users.active} · 대기 ${users.pending} · 정지 ${users.suspended}`} />
        <StatTile label="최근 7일 접속" value={users.active7d} sub={`오늘(24시간) ${users.active1d}명 · 신규 가입 ${users.new7d}명`} />
        <StatTile label="수집 중인 피드" value={feeds.subscribed} sub={`카탈로그 ${feeds.total}개 · 수집 실패 ${feeds.failing}개`} />
        <StatTile label="구독 수" value={subscriptions} sub={`사용자당 평균 ${(subscriptions / Math.max(1, users.total)).toFixed(1)}개`} />
        <StatTile label="아카이브 기사" value={articles.total} sub={`최근 24시간 신규 ${articles.new1d.toLocaleString('ko-KR')}건`} />
        <StatTile label="스크랩" value={picks.total} sub={`최근 7일 ${picks.new7d}건`} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <DailyBarChart title="신규 가입" unit="명" series={stats.signupsByDay} />
        <DailyBarChart title="스크랩" unit="건" series={stats.picksByDay} />
      </div>
    </div>
  );
}

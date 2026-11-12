'use client';

import { useEffect, useState } from 'react';

/** KST 기준 "2026년 11월 13일 금요일" */
function formatDateline(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

/**
 * PC 앱(Window Controls Overlay 모드) 전용 제목 표시줄 — 신문 제호처럼 "JD Times"와 데이트라인만 보여준다.
 * 보이고 숨는 건 globals.css의 display-mode 미디어쿼리가 담당하므로 브라우저/폰에서는 렌더돼도 보이지 않는다.
 * 바 전체가 창 드래그 영역이다.
 */
export default function AppTitleBar() {
  // 날짜는 서버 렌더와 어긋나지 않게 마운트 후에 채운다
  const [dateline, setDateline] = useState('');

  useEffect(() => {
    const update = () => setDateline(formatDateline(new Date()));
    update();
    const timer = setInterval(update, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="app-titlebar items-center gap-3 bg-(--color-ink) text-(--color-paper) px-4 select-none"
      aria-hidden="true"
    >
      <span className="font-(family-name:--font-display) text-[15px] font-bold tracking-tight leading-none">
        JD Times
      </span>
      <span className="h-3 w-6 border-y border-(--color-stamp-red)" />
      <span className="font-(family-name:--font-mono) text-[11px] text-(--color-paper)/60 truncate">{dateline}</span>
    </div>
  );
}

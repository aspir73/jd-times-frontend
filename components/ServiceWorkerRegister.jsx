'use client';

import { useEffect } from 'react';

/** PWA 서비스 워커 등록 (운영 빌드에서만 — 개발 중엔 캐시가 HMR을 방해하지 않게 건너뜀) */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 등록 실패해도 앱 자체는 정상 동작하므로 무시
    });
  }, []);

  return null;
}

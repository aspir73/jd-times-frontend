/** PWA 매니페스트 — 홈 화면/데스크톱에 앱으로 설치되게 한다 (Next.js가 /manifest.webmanifest로 서빙) */
export default function manifest() {
  return {
    name: 'JD Times',
    short_name: 'JD Times',
    description: 'AI/보안, IT, 경제 뉴스를 한 곳에서 — 여러 언론사가 확인한 뉴스를 모아봅니다.',
    lang: 'ko',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // PC 앱(Chrome/Edge 설치)에서 브라우저 기본 제목 표시줄(사이트 주소 노출) 대신 앱이 직접 그린 제목 표시줄을 쓴다.
    // 지원하지 않는 환경(폰, Safari 등)은 standalone으로 동작
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#eceeea',
    theme_color: '#1c232e',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata = {
  title: "JD Times",
  description: "AI/보안, IT, 경제 뉴스를 한 곳에서 — 여러 언론사가 확인한 뉴스를 모아봅니다.",
  applicationName: "JD Times",
  // 아이폰 "홈 화면에 추가" 시 주소창 없이 앱처럼 열리게
  appleWebApp: {
    capable: true,
    title: "JD Times",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#1c232e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard: 한글 UI/본문 서체 (CDN, 빌드 타임 다운로드 불필요) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        {/* Source Serif 4 (헤드라인) + IBM Plex Mono (타임스탬프/카운트) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

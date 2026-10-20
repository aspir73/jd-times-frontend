/** @type {import('next').NextConfig} */
const nextConfig = {
  // 서비스 워커 파일은 브라우저가 캐시하지 않게 해서, 수정하면 바로 새 버전이 적용되도록 한다
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default nextConfig;

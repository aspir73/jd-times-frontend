// JD Times 백엔드(Cloudflare Worker) API 클라이언트

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://jd-times-backend.jaedong-jung.workers.dev';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.error || `요청 실패 (HTTP ${res.status})`;
    throw new Error(message);
  }

  return data;
}

/** 등록된 피드 목록 조회 */
export async function getFeeds(category) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  const data = await request(`/api/feeds${qs}`);
  return data.feeds || [];
}

/** 클러스터링된 기사 목록 조회 */
export async function getClusters({ feedId, category, hours, force } = {}) {
  const params = new URLSearchParams();
  if (feedId) params.set('feedId', feedId);
  if (category) params.set('category', category);
  if (hours) params.set('hours', hours);
  if (force) params.set('force', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/rss${qs}`);
}

/** 새 피드 등록 (구글 키워드 / 언론사 프리셋 / 커스텀 RSS) */
export async function createFeed(payload) {
  return request('/api/feeds', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Today News에 기사 담기(Pick) */
export async function addPick(article) {
  return request('/api/picks', {
    method: 'POST',
    body: JSON.stringify(article),
  });
}

/** 스크랩 기사 순서 조정 (원하는 순서의 articleId 배열) */
export async function reorderPicks(articleIds) {
  return request('/api/picks/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ articleIds }),
  });
}

/** Today News에서 기사 빼기 */
export async function removePick(articleId) {
  return request(`/api/picks/${encodeURIComponent(articleId)}`, { method: 'DELETE' });
}

/** period: 'today' | 'week' | 'month' | undefined(전체) */
export async function getPicks(period) {
  const qs = period ? `?period=${period}` : '';
  const data = await request(`/api/picks${qs}`);
  return data.picks || [];
}

/** 여러 기사의 읽음/북마크 상태를 한 번에 변경 */
export async function bulkSetArticleStatus({ articleIds, isRead, isBookmarked }) {
  return request('/api/articles/status/bulk', {
    method: 'PATCH',
    body: JSON.stringify({ articleIds, isRead, isBookmarked }),
  });
}

/** 피드 정보 수정 (제목/카테고리/RSS 주소) */
export async function updateFeed(feedId, payload) {
  return request(`/api/feeds/${feedId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** 피드 삭제 */
export async function deleteFeed(feedId) {
  return request(`/api/feeds/${feedId}`, { method: 'DELETE' });
}
export async function setArticleStatus({ articleId, link, isRead, isBookmarked }) {
  return request('/api/articles/status', {
    method: 'PATCH',
    body: JSON.stringify({ articleId, link, isRead, isBookmarked }),
  });
}

/** 국내 주요 언론사 프리셋 (사이드바 빠른 등록 버튼용) */
export const MEDIA_PRESETS = [
  {
    title: '전자신문',
    rssUrl: 'https://rss.etnews.com/Section901.xml',
    category: 'IT/테크',
  },
  {
    title: '한국경제',
    rssUrl: 'https://www.hankyung.com/feed/economy',
    category: '경제',
  },
  {
    title: '조선일보',
    rssUrl: 'https://www.chosun.com/arc/outboundfeeds/rss/',
    category: '종합',
  },
];

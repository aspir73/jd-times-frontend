// JD Times 백엔드(Cloudflare Worker) API 클라이언트

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://jd-times-backend.jaedong-jung.workers.dev';

// 앱 공유 키 — 우리 프론트가 아닌 곳에서 Worker를 두드리는 봇을 걸러내는 1차 관문.
// 참고: 클라이언트 사이드 앱이라 이 값은 브라우저 번들/네트워크 탭에 노출된다. 사용자 인증은
// 아래 세션 토큰(Google 로그인)이 담당한다.
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

// 로그인 세션 토큰 (Google 로그인 후 백엔드가 발급). Worker가 다른 도메인이라 쿠키 대신 헤더로 보낸다.
const SESSION_KEY = 'jdtimes:session';
export const UNAUTHORIZED_EVENT = 'jdtimes:unauthorized';

export function getSessionToken() {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token) {
  try {
    if (token) window.localStorage.setItem(SESSION_KEY, token);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // 저장소 접근이 막힌 환경(사생활 보호 모드 등) — 이번 탭에서만 로그인 유지 못함
  }
}

/** 백엔드 에러 코드 → 화면에 보여줄 문구 */
const ERROR_MESSAGES = {
  LOGIN_REQUIRED: '로그인이 필요합니다.',
  ACCOUNT_PENDING: '어드민 승인 대기 중인 계정입니다.',
  ACCOUNT_SUSPENDED: '이용이 정지된 계정입니다.',
  FORBIDDEN: '권한이 없습니다.',
  ALREADY_SUBSCRIBED: '이미 구독 중인 피드입니다.',
  FEED_LIMIT_REACHED: '구독할 수 있는 피드 수를 초과했습니다.',
  INVALID_RSS_URL: 'RSS 주소는 http 또는 https로 시작해야 합니다.',
  INVALID_GOOGLE_TOKEN: 'Google 로그인 확인에 실패했습니다. 다시 시도해주세요.',
  CANNOT_MODIFY_SELF: '자기 자신의 상태나 권한은 바꿀 수 없습니다.',
  FEED_NOT_FOUND: '피드를 찾을 수 없습니다.',
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
};

async function request(path, options = {}) {
  const token = getSessionToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 세션 만료/로그아웃/정지 → 로그인 화면으로 돌려보낸다 (AuthProvider가 이 이벤트를 듣는다)
    if (res.status === 401 && data?.error === 'LOGIN_REQUIRED') {
      setSessionToken(null);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const code = data?.error;
    const error = new Error(ERROR_MESSAGES[code] || code || `요청 실패 (HTTP ${res.status})`);
    error.code = code;
    error.status = res.status;
    throw error;
  }

  return data;
}

// --- 인증 ---

/** Google 로그인 ID 토큰으로 백엔드 세션 발급 → { token, expiresAt, user } */
export async function loginWithGoogle(credential) {
  return request('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}

/** 현재 로그인한 사용자 정보 */
export async function getMe() {
  const data = await request('/api/auth/me');
  return data.user;
}

export async function logout() {
  return request('/api/auth/logout', { method: 'POST' });
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

/** 피드 정보 수정 (제목/카테고리/RSS 주소/검색 키워드) */
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

// --- 어드민 ---

export async function getAdminStats() {
  return request('/api/admin/stats');
}

export async function getAdminUsers() {
  const data = await request('/api/admin/users');
  return data.users || [];
}

/** 사용자 상태/권한 변경 — payload: { status?: 'pending'|'active'|'suspended', role?: 'user'|'admin' } */
export async function updateAdminUser(userId, payload) {
  return request(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getAdminUserFeeds(userId) {
  const data = await request(`/api/admin/users/${userId}/feeds`);
  return data.feeds || [];
}

export async function createAdminUserFeed(userId, payload) {
  return request(`/api/admin/users/${userId}/feeds`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUserFeed(userId, feedId, payload) {
  return request(`/api/admin/users/${userId}/feeds/${feedId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUserFeed(userId, feedId) {
  return request(`/api/admin/users/${userId}/feeds/${feedId}`, { method: 'DELETE' });
}

export async function getAdminFeeds() {
  const data = await request('/api/admin/feeds');
  return data.feeds || [];
}

/** 카탈로그 피드를 사용자들에게 배포 — { userIds: number[] } 또는 { allActive: true } */
export async function assignAdminFeed(feedId, payload) {
  return request(`/api/admin/feeds/${feedId}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminFeed(feedId) {
  return request(`/api/admin/feeds/${feedId}`, { method: 'DELETE' });
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

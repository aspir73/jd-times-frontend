/**
 * RSS 피드(특히 사용자가 직접 등록하는 커스텀 RSS)에서 온 link는 신뢰할 수 없는 외부 데이터다.
 * http/https가 아닌 스킴(javascript:, data: 등)이 그대로 <a href>에 들어가면 클릭 시
 * 실행될 수 있으므로, 렌더링 전에 프로토콜을 검증한다.
 */
export function safeHref(url) {
  if (typeof url !== 'string') return '#';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : '#';
  } catch {
    return '#';
  }
}

import { extractQueryFromUrl, parseQuery } from '@/lib/googleNewsQuery';
import { MEDIA_PRESETS } from '@/lib/api';

/** 구글 뉴스 검색 피드면 검색식 문자열, 아니면 null (주소에서 못 읽으면 저장된 keyword로 대신) */
export function getFeedQuery(feed) {
  const fromUrl = extractQueryFromUrl(feed?.rss_url);
  if (fromUrl !== null) return fromUrl;
  if (feed?.type === 'GOOGLE_KEYWORD') return feed.keyword || '';
  return null;
}

export function getFeedTerms(feed) {
  return parseQuery(getFeedQuery(feed) || '');
}

const PRESET_URLS = new Set(MEDIA_PRESETS.map((p) => p.rssUrl));

/** 목록 배지용 피드 종류 */
export function getFeedKind(feed) {
  if (getFeedQuery(feed) !== null) return { key: 'keyword', label: '키워드' };
  if (feed?.type === 'MEDIA_PRESET' || PRESET_URLS.has(feed?.rss_url)) return { key: 'media', label: '언론사' };
  return { key: 'rss', label: 'RSS' };
}

export function groupByCategory(feeds) {
  const map = new Map();
  for (const feed of feeds) {
    const cat = feed.category || '일반';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(feed);
  }
  return map;
}

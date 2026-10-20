/**
 * 구글 뉴스 검색 RSS(news.google.com/rss/search?q=...)의 검색식을
 * "모두 포함 / 하나라도 포함 / 제외" 세 그룹으로 나누고, 다시 검색식·RSS 주소로 조립한다.
 *
 * 조립 형식: `모두1 모두2 (하나1 OR 하나2) -제외1 -제외2`
 * 공백이 들어간 단어는 "LG Electronics"처럼 따옴표로 감싸 정확한 구문으로 검색한다.
 */

const GOOGLE_NEWS_SEARCH_PREFIX = 'https://news.google.com/rss/search';
const DEFAULT_PARAMS = { hl: 'ko', gl: 'KR', ceid: 'KR:ko' };

export function isGoogleNewsSearchUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const { hostname, pathname } = new URL(url.trim());
    return hostname === 'news.google.com' && pathname.startsWith('/rss/search');
  } catch {
    return false;
  }
}

/** RSS 주소에서 q 파라미터(디코딩된 검색식)를 꺼낸다. 구글 뉴스 검색 주소가 아니면 null */
export function extractQueryFromUrl(url) {
  if (!isGoogleNewsSearchUrl(url)) return null;
  try {
    return new URL(url.trim()).searchParams.get('q') || '';
  } catch {
    return null;
  }
}

/** 검색식 → 토큰 배열: { type: 'term', text, negated } | { type: 'or' } | { type: '(' } | { type: ')' } */
function tokenize(query) {
  const tokens = [];
  let i = 0;
  while (i < query.length) {
    const ch = query[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: ch });
      i++;
      continue;
    }

    let negated = false;
    if (ch === '-') {
      negated = true;
      i++;
    }

    let text = '';
    if (query[i] === '"') {
      const end = query.indexOf('"', i + 1);
      const stop = end === -1 ? query.length : end;
      text = query.slice(i + 1, stop);
      i = end === -1 ? query.length : end + 1;
    } else {
      while (i < query.length && !/[\s()]/.test(query[i])) {
        text += query[i];
        i++;
      }
    }

    text = text.trim();
    if (!text) continue;
    if (!negated && text === 'OR') tokens.push({ type: 'or' });
    else tokens.push({ type: 'term', text, negated });
  }
  return tokens;
}

/** 검색식 → { all, any, exclude } */
export function parseQuery(query) {
  const result = { all: [], any: [], exclude: [] };
  const tokens = tokenize(query || '');
  let depth = 0;

  tokens.forEach((tok, idx) => {
    if (tok.type === '(') depth++;
    else if (tok.type === ')') depth = Math.max(0, depth - 1);
    if (tok.type !== 'term') return;

    if (tok.negated) {
      result.exclude.push(tok.text);
      return;
    }
    // 괄호 안이거나 OR 바로 옆에 붙은 단어는 "하나라도 포함" 그룹으로 본다
    const nextToOr = tokens[idx - 1]?.type === 'or' || tokens[idx + 1]?.type === 'or';
    if (depth > 0 || nextToOr) result.any.push(tok.text);
    else result.all.push(tok.text);
  });

  return {
    all: dedupe(result.all),
    any: dedupe(result.any),
    exclude: dedupe(result.exclude),
  };
}

function dedupe(list) {
  return [...new Set(list)];
}

function quote(term) {
  return /\s/.test(term) ? `"${term}"` : term;
}

/** { all, any, exclude } → 검색식 문자열 */
export function buildQuery({ all = [], any = [], exclude = [] }) {
  const parts = all.map(quote);
  if (any.length > 0) parts.push(`(${any.map(quote).join(' OR ')})`);
  parts.push(...exclude.map((t) => `-${quote(t)}`));
  return parts.join(' ');
}

/** 검색식 → 구글 뉴스 RSS 주소. 기존 주소의 hl/gl/ceid 등 다른 파라미터는 그대로 유지한다 */
export function buildGoogleNewsUrl(query, baseUrl) {
  const url = new URL(isGoogleNewsSearchUrl(baseUrl) ? baseUrl.trim() : GOOGLE_NEWS_SEARCH_PREFIX);
  for (const [key, value] of Object.entries(DEFAULT_PARAMS)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  url.searchParams.set('q', query);
  // URLSearchParams는 공백을 '+'로 바꾸는데, 백엔드 buildGoogleRssUrl과 같은 %20 형식으로 맞춘다
  // (검색어에 들어간 실제 '+'는 %2B로 인코딩되므로 영향 없음)
  return url.toString().replace(/\+/g, '%20');
}

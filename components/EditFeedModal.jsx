'use client';

import { useRef, useState } from 'react';
import {
  buildGoogleNewsUrl,
  buildQuery,
  extractQueryFromUrl,
  parseQuery,
} from '@/lib/googleNewsQuery';

/**
 * 키워드를 칩 형태로 입력/삭제하는 입력창.
 * Enter·쉼표·"추가" 버튼으로 추가, 입력창이 비었을 때 Backspace로 마지막 칩 삭제, 포커스를 벗어나면 입력 중인 단어도 추가.
 *
 * 모바일 키보드 대응:
 * - 한글 조합 중 Enter는 PC 크롬에선 keydown이 두 번(조합 중 + 조합 끝) 오지만 모바일에선 조합 중 한 번만 온다.
 *   그래서 조합 중 Enter는 "조합이 끝나면 추가"로 예약해두고 compositionend에서 처리한다.
 * - 모바일에선 쉼표 keydown이 key='Unidentified'로 와서 감지가 안 되므로 입력값(onChange)에서 쉼표를 찾는다.
 */
function KeywordChipInput({ label, hint, terms, onChange, tone = 'blue', placeholder }) {
  const [draft, setDraft] = useState('');
  const commitAfterCompositionRef = useRef(false);

  const commit = (value = draft) => {
    const next = value
      .split(',')
      .map((t) => t.replace(/"/g, '').trim())
      .filter((t) => t && !terms.includes(t));
    if (next.length > 0) onChange([...terms, ...new Set(next)]);
    setDraft('');
  };

  const handleChange = (e) => {
    const value = e.target.value;
    if (value.includes(',') && !e.nativeEvent.isComposing) commit(value);
    else setDraft(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // 조합 중이든 아니든 Enter로 폼이 제출(모달 닫힘)되지 않게 막는다
      e.preventDefault();
      if (e.nativeEvent.isComposing) commitAfterCompositionRef.current = true;
      else commit();
    } else if (e.key === ',' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && terms.length > 0) {
      onChange(terms.slice(0, -1));
    }
  };

  const handleCompositionEnd = (e) => {
    if (!commitAfterCompositionRef.current) return;
    commitAfterCompositionRef.current = false;
    commit(e.currentTarget.value);
  };

  const chipClass =
    tone === 'red'
      ? 'border-(--color-stamp-red)/40 bg-(--color-stamp-red)/10 text-(--color-stamp-red)'
      : 'border-(--color-wire-blue)/40 bg-(--color-wire-blue)/10 text-(--color-wire-blue)';

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs font-medium text-(--color-ink-soft)">{label}</label>
        <span className="text-[11px] text-(--color-ink-faint)">{hint}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 rounded border border-(--color-rule) px-2 py-1.5 bg-(--color-paper) focus-within:border-(--color-wire-blue)">
        {terms.map((term) => (
          <span
            key={term}
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${chipClass}`}
          >
            {tone === 'red' && '−'}
            {term}
            <button
              type="button"
              onClick={() => onChange(terms.filter((t) => t !== term))}
              aria-label={`${term} 삭제`}
              className="opacity-60 hover:opacity-100 cursor-pointer leading-none"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionEnd={handleCompositionEnd}
          onBlur={(e) => commit(e.target.value)}
          enterKeyHint="enter"
          placeholder={terms.length === 0 ? placeholder : ''}
          className="flex-1 min-w-24 bg-transparent py-0.5 text-base sm:text-sm outline-none"
        />
        {/* 터치 환경에서 확실하게 추가할 수 있는 버튼 (mousedown 기본동작을 막아 입력창 포커스/키보드 유지) */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => commit()}
          disabled={!draft.trim()}
          className="shrink-0 rounded border border-(--color-rule) px-2 py-0.5 text-xs text-(--color-ink-soft) hover:bg-(--color-ink)/5 cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          추가
        </button>
      </div>
    </div>
  );
}

export default function EditFeedModal({ feed, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(feed?.title || '');
  const [category, setCategory] = useState(feed?.category || '');
  const [rssUrl, setRssUrl] = useState(feed?.rss_url || '');
  // 구글 뉴스 검색 피드면 RSS 주소의 q 파라미터를 풀어서 키워드 그룹으로 편집한다
  // (주소 형식이 달라 못 읽어도 키워드 타입 피드면 저장된 keyword로 대신 채운다)
  const urlQuery = extractQueryFromUrl(feed?.rss_url);
  const isGoogleSearch = urlQuery !== null || feed?.type === 'GOOGLE_KEYWORD';
  const initialQuery = urlQuery || feed?.keyword || '';
  const [terms, setTerms] = useState(() => parseQuery(initialQuery || ''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!feed) return null;

  const query = buildQuery(terms);
  const effectiveRssUrl = isGoogleSearch ? buildGoogleNewsUrl(query, feed.rss_url) : rssUrl.trim();
  const setGroup = (key) => (next) => setTerms((t) => ({ ...t, [key]: next }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('피드 이름은 비워둘 수 없습니다.');
      return;
    }
    if (isGoogleSearch && terms.all.length === 0 && terms.any.length === 0) {
      setError('"모두 포함" 또는 "하나라도 포함"에 키워드를 하나 이상 넣어주세요.');
      return;
    }
    if (!effectiveRssUrl) {
      setError('RSS 주소는 비워둘 수 없습니다.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await onSave(feed.id, {
        title: title.trim(),
        category: category.trim() || '일반',
        rssUrl: effectiveRssUrl,
        ...(isGoogleSearch && { keyword: query }),
      });
      onClose();
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${feed.title}" 피드를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await onDelete(feed.id);
      onClose();
    } catch (err) {
      setError(err.message || '삭제에 실패했습니다.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink)/40 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] flex flex-col rounded-lg bg-(--color-paper-raised) border border-(--color-rule) shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-rule)">
          <h2 className="font-(family-name:--font-display) text-lg font-semibold">피드 관리</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-(--color-ink-faint) hover:text-(--color-ink) cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-(--color-ink-soft) mb-1">
              피드 이름
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-(--color-rule) px-3 py-2 text-sm bg-(--color-paper) focus:border-(--color-wire-blue)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-(--color-ink-soft) mb-1">
              카테고리
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-(--color-rule) px-3 py-2 text-sm bg-(--color-paper) focus:border-(--color-wire-blue)"
            />
          </div>

          {isGoogleSearch ? (
            <div className="space-y-3 rounded border border-(--color-rule) p-3">
              <div>
                <div className="text-xs font-medium text-(--color-ink-soft) mb-1">현재 검색 키워드</div>
                <div className="rounded bg-(--color-paper) border border-(--color-rule) px-3 py-2 text-sm font-(family-name:--font-mono) break-all">
                  {query || <span className="text-(--color-ink-faint)">(비어 있음)</span>}
                </div>
              </div>

              <KeywordChipInput
                label="모두 포함"
                hint="모든 단어가 들어간 기사"
                terms={terms.all}
                onChange={setGroup('all')}
                placeholder="예: LG전자"
              />
              <KeywordChipInput
                label="하나라도 포함"
                hint="이 중 하나 이상 들어간 기사"
                terms={terms.any}
                onChange={setGroup('any')}
                placeholder="예: 로봇, 가전"
              />
              <KeywordChipInput
                label="제외"
                hint="이 단어가 들어간 기사는 제외"
                terms={terms.exclude}
                onChange={setGroup('exclude')}
                tone="red"
                placeholder="예: 주가"
              />

              <p className="text-[11px] text-(--color-ink-faint)">
                Enter 또는 쉼표로 추가 · 띄어쓰기가 있는 단어는 정확한 구문으로 검색됩니다
              </p>

              <details className="text-[11px] text-(--color-ink-faint)">
                <summary className="cursor-pointer">RSS 주소 보기</summary>
                <div className="mt-1 font-(family-name:--font-mono) break-all">{effectiveRssUrl}</div>
              </details>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-(--color-ink-soft) mb-1">
                RSS 주소
              </label>
              <input
                value={rssUrl}
                onChange={(e) => setRssUrl(e.target.value)}
                className="w-full rounded border border-(--color-rule) px-3 py-2 text-sm bg-(--color-paper) font-(family-name:--font-mono) focus:border-(--color-wire-blue)"
              />
            </div>
          )}

          {error && <p className="text-xs text-(--color-stamp-red)">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="rounded border border-(--color-stamp-red) text-(--color-stamp-red) text-sm px-3 py-2 hover:bg-(--color-stamp-red)/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              삭제
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded bg-(--color-ink) text-(--color-paper) py-2 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {submitting ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

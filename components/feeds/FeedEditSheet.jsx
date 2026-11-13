'use client';

import { useId, useState } from 'react';
import { buildGoogleNewsUrl, buildQuery } from '@/lib/googleNewsQuery';
import Sheet, { SheetSection, inputClass, labelClass } from './Sheet';
import KeywordEditor from './KeywordEditor';
import CategoryField from './CategoryField';
import { getFeedKind, getFeedQuery, getFeedTerms } from './feedInfo';

/**
 * 피드 하나 편집: 기본 정보(이름·카테고리) + 검색 조건(키워드 피드) 또는 RSS 주소.
 * onBack을 주면 "피드 관리" 목록에서 들어온 것으로 보고 뒤로 버튼을 보여준다.
 */
export default function FeedEditSheet({ feed, categories, onSave, onDelete, onClose, onBack }) {
  const formId = useId();
  const [title, setTitle] = useState(feed.title || '');
  const [category, setCategory] = useState(feed.category || '');
  const [rssUrl, setRssUrl] = useState(feed.rss_url || '');
  const isGoogleSearch = getFeedQuery(feed) !== null;
  const [terms, setTerms] = useState(() => getFeedTerms(feed));
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  const query = buildQuery(terms);
  const effectiveRssUrl = isGoogleSearch ? buildGoogleNewsUrl(query, feed.rss_url) : rssUrl.trim();
  const dirty =
    title.trim() !== (feed.title || '') ||
    (category.trim() || '일반') !== (feed.category || '일반') ||
    (isGoogleSearch ? query !== buildQuery(getFeedTerms(feed)) : effectiveRssUrl !== feed.rss_url);

  const finish = onBack || onClose;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('피드 이름은 비워둘 수 없습니다.');
    if (isGoogleSearch && terms.all.length === 0 && terms.any.length === 0) {
      return setError('"모두 포함" 또는 "하나라도 포함"에 키워드를 하나 이상 넣어주세요.');
    }
    if (!effectiveRssUrl) return setError('RSS 주소는 비워둘 수 없습니다.');
    try {
      setSubmitting(true);
      setError('');
      await onSave(feed.id, {
        title: title.trim(),
        category: category.trim() || '일반',
        rssUrl: effectiveRssUrl,
        ...(isGoogleSearch && { keyword: query }),
      });
      finish();
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.');
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      setError('');
      await onDelete(feed.id);
      finish();
    } catch (err) {
      setError(err.message || '삭제에 실패했습니다.');
      setSubmitting(false);
      setConfirmingDelete(false);
    }
  };

  const footer = confirmingDelete ? (
    <div className="flex items-center gap-2">
      <p className="flex-1 text-xs text-(--color-stamp-red)">
        &ldquo;{feed.title}&rdquo;를 삭제할까요? 되돌릴 수 없습니다.
      </p>
      <button
        type="button"
        onClick={() => setConfirmingDelete(false)}
        disabled={submitting}
        className="rounded border border-(--color-rule) px-3 py-2 text-sm cursor-pointer hover:bg-(--color-rule)/60 disabled:opacity-50"
      >
        취소
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={submitting}
        className="rounded bg-(--color-stamp-red) text-(--color-paper) px-3 py-2 text-sm font-medium cursor-pointer hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? '삭제 중…' : '삭제'}
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        disabled={submitting}
        className="rounded px-2 py-2 text-sm text-(--color-stamp-red) hover:bg-(--color-stamp-red)/10 cursor-pointer disabled:opacity-50"
      >
        피드 삭제
      </button>
      <span className="flex-1" />
      <button
        type="button"
        onClick={finish}
        className="rounded border border-(--color-rule) px-3 py-2 text-sm cursor-pointer hover:bg-(--color-rule)/60"
      >
        취소
      </button>
      <button
        type="submit"
        form={formId}
        disabled={submitting || !dirty}
        className="rounded bg-(--color-ink) text-(--color-paper) px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-default"
      >
        {submitting ? '저장 중…' : '저장'}
      </button>
    </div>
  );

  return (
    <Sheet
      title="피드 편집"
      subtitle={`${getFeedKind(feed).label} 피드 · ${feed.title}`}
      onClose={onClose}
      onBack={onBack}
      footer={footer}
    >
      <form id={formId} onSubmit={handleSave} className="px-5 py-4 space-y-6">
        <SheetSection title="기본 정보">
          <div>
            <label className={labelClass}>피드 이름</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <CategoryField value={category} onChange={setCategory} categories={categories} />
        </SheetSection>

        {isGoogleSearch ? (
          <SheetSection title="검색 조건" description="구글 뉴스에서 이 조건에 맞는 기사를 모아옵니다.">
            <KeywordEditor terms={terms} onChange={setTerms} />
            <details className="text-[11px] text-(--color-ink-faint)">
              <summary className="cursor-pointer">RSS 주소 보기</summary>
              <div className="mt-1 font-(family-name:--font-mono) break-all">{effectiveRssUrl}</div>
            </details>
          </SheetSection>
        ) : (
          <SheetSection title="RSS 주소">
            <input
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              className={`${inputClass} font-(family-name:--font-mono)`}
            />
          </SheetSection>
        )}

        {error && <p className="text-xs text-(--color-stamp-red)">{error}</p>}
      </form>
    </Sheet>
  );
}

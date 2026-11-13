'use client';

import { useId, useState } from 'react';
import { MEDIA_PRESETS } from '@/lib/api';
import { buildQuery } from '@/lib/googleNewsQuery';
import Sheet, { SheetSection, inputClass, labelClass } from './Sheet';
import KeywordEditor from './KeywordEditor';
import CategoryField from './CategoryField';

const MODES = [
  { key: 'GOOGLE_KEYWORD', label: '키워드 검색', icon: '🔎', desc: '구글 뉴스에서 키워드로' },
  { key: 'MEDIA_PRESET', label: '언론사', icon: '📰', desc: '주요 언론사 피드' },
  { key: 'CUSTOM', label: '직접 입력', icon: '🔗', desc: 'RSS 주소 붙여넣기' },
];

const EMPTY_TERMS = { all: [], any: [], exclude: [] };

/**
 * 새 피드 추가. 키워드 검색은 편집 화면과 같은 "모두 포함/하나라도/제외" 편집기로 처음부터 조건을 넣을 수 있다.
 * feeds를 주면 이미 구독 중인 언론사는 "구독 중"으로 표시한다.
 */
export default function FeedAddSheet({ onSubmit, categories, feeds = [], onClose, onBack }) {
  const formId = useId();
  const [mode, setMode] = useState('GOOGLE_KEYWORD');
  const [terms, setTerms] = useState(EMPTY_TERMS);
  const [title, setTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const finish = onBack || onClose;
  const subscribedUrls = new Set(feeds.map((f) => f.rss_url));
  // 이름을 비워두면 키워드로 자동 생성 (예: "LG전자 로봇")
  const autoTitle = [...terms.all, ...terms.any].slice(0, 3).join(' ');

  const submit = async (payload) => {
    try {
      setSubmitting(true);
      setError('');
      await onSubmit(payload);
      finish();
    } catch (err) {
      setError(err.message || '피드 등록에 실패했습니다.');
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'GOOGLE_KEYWORD') {
      if (terms.all.length === 0 && terms.any.length === 0) {
        return setError('"모두 포함" 또는 "하나라도 포함"에 키워드를 하나 이상 넣어주세요.');
      }
      const query = buildQuery(terms);
      return submit({
        type: 'GOOGLE_KEYWORD',
        title: title.trim() || autoTitle,
        keyword: query,
        category: category.trim() || '일반',
      });
    }
    if (!title.trim() || !customUrl.trim()) return setError('피드 이름과 RSS 주소를 모두 입력해주세요.');
    return submit({
      type: 'CUSTOM',
      title: title.trim(),
      rssUrl: customUrl.trim(),
      category: category.trim() || '일반',
    });
  };

  const switchMode = (key) => {
    setMode(key);
    setError('');
  };

  const footer =
    mode === 'MEDIA_PRESET' ? null : (
      <div className="flex items-center gap-2">
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
          disabled={submitting}
          className="rounded bg-(--color-ink) text-(--color-paper) px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
        >
          {submitting ? '등록 중…' : '피드 추가'}
        </button>
      </div>
    );

  return (
    <Sheet title="새 피드 추가" onClose={onClose} onBack={onBack} footer={footer}>
      <div className="px-5 pt-4">
        <div className="grid grid-cols-3 gap-2" role="tablist">
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchMode(m.key)}
                className={[
                  'rounded-lg border px-2 py-2.5 text-left cursor-pointer transition-colors',
                  active
                    ? 'border-(--color-ink) bg-(--color-ink) text-(--color-paper)'
                    : 'border-(--color-rule) hover:border-(--color-ink-soft)',
                ].join(' ')}
              >
                <div className="text-sm font-medium">
                  <span aria-hidden="true">{m.icon}</span> {m.label}
                </div>
                <div className={`text-[11px] mt-0.5 ${active ? 'opacity-70' : 'text-(--color-ink-faint)'}`}>
                  {m.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'MEDIA_PRESET' ? (
        <div className="px-5 py-4 space-y-2">
          <p className="text-xs text-(--color-ink-soft)">누르면 바로 구독됩니다. 이름·카테고리는 나중에 편집할 수 있어요.</p>
          {MEDIA_PRESETS.map((preset) => {
            const subscribed = subscribedUrls.has(preset.rssUrl);
            return (
              <button
                key={preset.title}
                type="button"
                disabled={submitting || subscribed}
                onClick={() =>
                  submit({ type: 'MEDIA_PRESET', title: preset.title, rssUrl: preset.rssUrl, category: preset.category })
                }
                className="w-full flex items-center justify-between rounded border border-(--color-rule) px-3 py-2.5 text-sm hover:border-(--color-wire-blue) hover:text-(--color-wire-blue) transition-colors cursor-pointer disabled:cursor-default disabled:hover:border-(--color-rule) disabled:hover:text-inherit"
              >
                <span className="font-medium">{preset.title}</span>
                <span className="font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint)">
                  {subscribed ? '✓ 구독 중' : `${preset.category}  +`}
                </span>
              </button>
            );
          })}
          {error && <p className="text-xs text-(--color-stamp-red)">{error}</p>}
        </div>
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="px-5 py-4 space-y-6">
          {mode === 'GOOGLE_KEYWORD' ? (
            <>
              <SheetSection title="검색 조건" description="키워드를 하나씩 넣고 Enter. 나중에 언제든 바꿀 수 있어요.">
                <KeywordEditor terms={terms} onChange={setTerms} autoFocus />
              </SheetSection>
              <SheetSection title="표시 정보">
                <div>
                  <label className={labelClass}>피드 이름</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={autoTitle ? `비워두면 "${autoTitle}"` : '비워두면 키워드로 자동 지정'}
                    className={inputClass}
                  />
                </div>
                <CategoryField value={category} onChange={setCategory} categories={categories} />
              </SheetSection>
            </>
          ) : (
            <SheetSection title="RSS 정보">
              <div>
                <label className={labelClass}>피드 이름</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 보안뉴스"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>RSS 주소</label>
                <input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://..."
                  inputMode="url"
                  className={`${inputClass} font-(family-name:--font-mono)`}
                />
              </div>
              <CategoryField value={category} onChange={setCategory} categories={categories} />
            </SheetSection>
          )}
          {error && <p className="text-xs text-(--color-stamp-red)">{error}</p>}
        </form>
      )}
    </Sheet>
  );
}

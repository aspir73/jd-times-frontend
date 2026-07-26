'use client';

import { useState } from 'react';
import { MEDIA_PRESETS } from '@/lib/api';

const MODES = [
  { key: 'GOOGLE_KEYWORD', label: '키워드 검색' },
  { key: 'MEDIA_PRESET', label: '언론사 프리셋' },
  { key: 'CUSTOM', label: '직접 입력' },
];

export default function AddFeedModal({ open, onClose, onSubmit, existingCategories }) {
  const [mode, setMode] = useState('GOOGLE_KEYWORD');
  const [keyword, setKeyword] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const reset = () => {
    setKeyword('');
    setCustomTitle('');
    setCustomUrl('');
    setCategory('');
    setError('');
    setMode('GOOGLE_KEYWORD');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let payload;
    if (mode === 'GOOGLE_KEYWORD') {
      if (!keyword.trim()) return setError('키워드를 입력해주세요.');
      payload = {
        type: 'GOOGLE_KEYWORD',
        title: keyword.trim(),
        keyword: keyword.trim(),
        category: category.trim() || '일반',
      };
    } else if (mode === 'CUSTOM') {
      if (!customTitle.trim() || !customUrl.trim())
        return setError('제목과 RSS 주소를 모두 입력해주세요.');
      payload = {
        type: 'CUSTOM',
        title: customTitle.trim(),
        rssUrl: customUrl.trim(),
        category: category.trim() || '일반',
      };
    }

    try {
      setSubmitting(true);
      await onSubmit(payload);
      handleClose();
    } catch (err) {
      setError(err.message || '피드 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePresetClick = async (preset) => {
    setError('');
    try {
      setSubmitting(true);
      await onSubmit({
        type: 'MEDIA_PRESET',
        title: preset.title,
        rssUrl: preset.rssUrl,
        category: preset.category,
      });
      handleClose();
    } catch (err) {
      setError(err.message || '피드 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-ink)/40 px-4"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-(--color-paper-raised) border border-(--color-rule) shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-rule)">
          <h2 className="font-(family-name:--font-display) text-lg font-semibold">피드 추가</h2>
          <button
            onClick={handleClose}
            aria-label="닫기"
            className="text-(--color-ink-faint) hover:text-(--color-ink) cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-3">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={[
                'text-xs px-3 py-1.5 rounded-full cursor-pointer transition-colors',
                mode === m.key
                  ? 'bg-(--color-ink) text-(--color-paper)'
                  : 'text-(--color-ink-soft) hover:bg-(--color-rule)/60',
              ].join(' ')}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4">
          {mode === 'MEDIA_PRESET' ? (
            <div className="space-y-2">
              <p className="text-xs text-(--color-ink-soft) mb-2">
                버튼을 누르면 바로 구독이 추가됩니다.
              </p>
              {MEDIA_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  disabled={submitting}
                  onClick={() => handlePresetClick(preset)}
                  className="w-full flex items-center justify-between rounded border border-(--color-rule) px-3 py-2 text-sm hover:border-(--color-wire-blue) hover:text-(--color-wire-blue) transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="font-medium">{preset.title}</span>
                  <span className="font-(family-name:--font-mono) text-[11px] text-(--color-ink-faint)">
                    {preset.category}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'GOOGLE_KEYWORD' && (
                <div>
                  <label className="block text-xs font-medium text-(--color-ink-soft) mb-1">
                    검색 키워드
                  </label>
                  <input
                    autoFocus
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="예: AI 보안"
                    className="w-full rounded border border-(--color-rule) px-3 py-2 text-sm bg-(--color-paper) focus:border-(--color-wire-blue)"
                  />
                </div>
              )}

              {mode === 'CUSTOM' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-(--color-ink-soft) mb-1">
                      피드 이름
                    </label>
                    <input
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="예: 보안뉴스"
                      className="w-full rounded border border-(--color-rule) px-3 py-2 text-sm bg-(--color-paper) focus:border-(--color-wire-blue)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-(--color-ink-soft) mb-1">
                      RSS 주소
                    </label>
                    <input
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded border border-(--color-rule) px-3 py-2 text-sm bg-(--color-paper) focus:border-(--color-wire-blue)"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-(--color-ink-soft) mb-1">
                  카테고리
                </label>
                <input
                  list="category-suggestions"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: AI/보안 (비워두면 일반)"
                  className="w-full rounded border border-(--color-rule) px-3 py-2 text-sm bg-(--color-paper) focus:border-(--color-wire-blue)"
                />
                <datalist id="category-suggestions">
                  {(existingCategories || []).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {error && <p className="text-xs text-(--color-stamp-red)">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded bg-(--color-ink) text-(--color-paper) py-2 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {submitting ? '등록 중…' : '피드 등록'}
              </button>
            </form>
          )}

          {mode === 'MEDIA_PRESET' && error && (
            <p className="text-xs text-(--color-stamp-red) mt-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

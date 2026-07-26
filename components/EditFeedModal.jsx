'use client';

import { useState } from 'react';

export default function EditFeedModal({ feed, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(feed?.title || '');
  const [category, setCategory] = useState(feed?.category || '');
  const [rssUrl, setRssUrl] = useState(feed?.rss_url || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!feed) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim() || !rssUrl.trim()) {
      setError('이름과 RSS 주소는 비워둘 수 없습니다.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await onSave(feed.id, {
        title: title.trim(),
        category: category.trim() || '일반',
        rssUrl: rssUrl.trim(),
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
        className="w-full max-w-md rounded-lg bg-(--color-paper-raised) border border-(--color-rule) shadow-xl"
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

        <form onSubmit={handleSave} className="px-5 py-4 space-y-3">
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

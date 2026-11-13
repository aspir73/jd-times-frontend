'use client';

import FeedAddSheet from '@/components/feeds/FeedAddSheet';

/** 단독으로 띄우는 "새 피드 추가" 창 (어드민의 사용자별 피드 관리에서 사용) */
export default function AddFeedModal({ open, onClose, onSubmit, existingCategories, feeds }) {
  if (!open) return null;
  return <FeedAddSheet onSubmit={onSubmit} categories={existingCategories} feeds={feeds} onClose={onClose} />;
}

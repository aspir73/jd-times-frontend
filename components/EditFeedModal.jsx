'use client';

import FeedEditSheet from '@/components/feeds/FeedEditSheet';

/** 단독으로 띄우는 "피드 편집" 창 (어드민의 사용자별 피드 관리에서 사용) */
export default function EditFeedModal({ feed, categories, onClose, onSave, onDelete }) {
  if (!feed) return null;
  return <FeedEditSheet feed={feed} categories={categories} onSave={onSave} onDelete={onDelete} onClose={onClose} />;
}

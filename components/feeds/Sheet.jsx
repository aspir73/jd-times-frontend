'use client';

import { useEffect } from 'react';

/**
 * 피드 추가/편집/관리 창의 공통 틀.
 * 모바일에선 화면 아래에서 올라오는 시트, 넓은 화면에선 가운데 대화상자로 뜬다.
 * Esc 또는 바깥 영역 클릭으로 닫히고, onBack을 주면 제목 왼쪽에 "← 뒤로" 버튼이 생긴다.
 */
export default function Sheet({ title, subtitle, onClose, onBack, headerAction, footer, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (onBack) onBack();
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-(--color-ink)/40 sm:px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={[
          'w-full flex flex-col bg-(--color-paper-raised) border border-(--color-rule) shadow-xl',
          'max-h-[92dvh] rounded-t-2xl sm:rounded-lg',
          wide ? 'sm:max-w-xl' : 'sm:max-w-md',
        ].join(' ')}
      >
        {/* 모바일 시트 손잡이 */}
        <div className="sm:hidden flex justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-(--color-rule)" />
        </div>

        <div className="flex items-center gap-2 px-5 pt-3 pb-3 sm:pt-4 border-b border-(--color-rule)">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="뒤로"
              className="-ml-1 shrink-0 rounded px-1.5 py-1 text-(--color-ink-soft) hover:bg-(--color-rule)/60 hover:text-(--color-ink) cursor-pointer"
            >
              ←
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-(family-name:--font-display) text-lg font-semibold truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-(--color-ink-faint) truncate">{subtitle}</p>}
          </div>
          {headerAction}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 rounded px-1.5 py-1 text-(--color-ink-faint) hover:text-(--color-ink) cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="border-t border-(--color-rule) px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** 폼 안에서 "기본 정보", "검색 조건" 같은 묶음 제목 */
export function SheetSection({ title, description, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-(family-name:--font-mono) text-[11px] font-semibold uppercase tracking-wider text-(--color-ink-faint)">
          {title}
        </h3>
        {description && <p className="text-[11px] text-(--color-ink-faint) mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export const inputClass =
  'w-full rounded border border-(--color-rule) px-3 py-2 text-base sm:text-sm bg-(--color-paper) focus:border-(--color-wire-blue) outline-none';

export const labelClass = 'block text-xs font-medium text-(--color-ink-soft) mb-1';

'use client';

import { useState } from 'react';
import { inputClass, labelClass } from './Sheet';

/**
 * 카테고리 입력: 기존 카테고리는 칩을 눌러 바로 고르고, 새 이름은 아래 입력창에 직접 쓴다.
 * 칩으로 고른 값은 입력창에 다시 보이지 않게(같은 값이 두 번 보이지 않게) 입력창은 자체 draft만 보여준다.
 */
export default function CategoryField({ value, onChange, categories = [] }) {
  const options = [...new Set(categories.filter(Boolean))];
  const [draft, setDraft] = useState(() => (options.includes(value.trim()) ? '' : value));
  const current = value.trim();

  const pick = (c) => {
    setDraft('');
    onChange(current === c ? '' : c);
  };

  return (
    <div>
      <label className={labelClass}>카테고리</label>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {options.map((c) => {
            const active = current === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => pick(c)}
                aria-pressed={active}
                className={[
                  'rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors',
                  active
                    ? 'border-(--color-ink) bg-(--color-ink) text-(--color-paper)'
                    : 'border-(--color-rule) text-(--color-ink-soft) hover:border-(--color-ink-soft)',
                ].join(' ')}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={options.length > 0 ? '또는 새 카테고리 입력 (비워두면 일반)' : '예: AI/보안 (비워두면 일반)'}
        className={inputClass}
      />
    </div>
  );
}

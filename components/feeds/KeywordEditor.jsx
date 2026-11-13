'use client';

import { useRef, useState } from 'react';
import { buildQuery } from '@/lib/googleNewsQuery';

/**
 * 키워드를 칩 형태로 입력/삭제하는 입력창.
 * Enter·쉼표·"추가" 버튼으로 추가, 입력창이 비었을 때 Backspace로 마지막 칩 삭제, 포커스를 벗어나면 입력 중인 단어도 추가.
 *
 * 모바일 키보드 대응:
 * - 한글 조합 중 Enter는 PC 크롬에선 keydown이 두 번(조합 중 + 조합 끝) 오지만 모바일에선 조합 중 한 번만 온다.
 *   그래서 조합 중 Enter는 "조합이 끝나면 추가"로 예약해두고 compositionend에서 처리한다.
 * - 모바일에선 쉼표 keydown이 key='Unidentified'로 와서 감지가 안 되므로 입력값(onChange)에서 쉼표를 찾는다.
 */
export function KeywordChipInput({ label, hint, terms, onChange, tone = 'blue', placeholder, autoFocus }) {
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
      // 조합 중이든 아니든 Enter로 폼이 제출(창 닫힘)되지 않게 막는다
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

  const chipClass = CHIP_TONES[tone] || CHIP_TONES.blue;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="text-xs font-medium text-(--color-ink-soft)">{label}</label>
        <span className="text-[11px] text-(--color-ink-faint) text-right">{hint}</span>
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
              className="-mr-1 px-1 opacity-60 hover:opacity-100 cursor-pointer leading-none"
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
          autoFocus={autoFocus}
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

const CHIP_TONES = {
  blue: 'border-(--color-wire-blue)/40 bg-(--color-wire-blue)/10 text-(--color-wire-blue)',
  outline: 'border-(--color-wire-blue)/50 border-dashed text-(--color-wire-blue)',
  red: 'border-(--color-stamp-red)/40 bg-(--color-stamp-red)/10 text-(--color-stamp-red)',
};

/**
 * 구글 뉴스 검색 조건 편집기: 모두 포함 / 하나라도 포함 / 제외 세 그룹 + 실제로 검색될 식 미리보기.
 * terms = { all, any, exclude }
 */
export default function KeywordEditor({ terms, onChange, autoFocus }) {
  const setGroup = (key) => (next) => onChange({ ...terms, [key]: next });
  const query = buildQuery(terms);

  return (
    <div className="space-y-3">
      <KeywordChipInput
        label="모두 포함"
        hint="모든 단어가 들어간 기사"
        terms={terms.all}
        onChange={setGroup('all')}
        placeholder="예: LG전자"
        autoFocus={autoFocus}
      />
      <KeywordChipInput
        label="하나라도 포함"
        hint="이 중 하나 이상"
        terms={terms.any}
        onChange={setGroup('any')}
        tone="outline"
        placeholder="예: 로봇, 가전"
      />
      <KeywordChipInput
        label="제외"
        hint="이 단어가 있으면 제외"
        terms={terms.exclude}
        onChange={setGroup('exclude')}
        tone="red"
        placeholder="예: 주가"
      />

      <div className="rounded bg-(--color-paper) border border-dashed border-(--color-rule) px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] text-(--color-ink-faint)">실제 검색식</span>
          <span className="text-[11px] text-(--color-ink-faint)">Enter·쉼표로 추가</span>
        </div>
        <div className="mt-0.5 text-sm font-(family-name:--font-mono) break-all">
          {query || <span className="text-(--color-ink-faint)">(키워드를 넣어주세요)</span>}
        </div>
      </div>
    </div>
  );
}

/** 목록에서 피드의 검색 조건을 한눈에 보여주는 작은 칩 묶음 */
export function KeywordSummary({ terms, max = 6 }) {
  const items = [
    ...terms.all.map((t) => ({ t, tone: 'blue', prefix: '' })),
    ...terms.any.map((t) => ({ t, tone: 'outline', prefix: '' })),
    ...terms.exclude.map((t) => ({ t, tone: 'red', prefix: '−' })),
  ];
  if (items.length === 0) return null;
  const shown = items.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map(({ t, tone, prefix }) => (
        <span key={`${tone}:${t}`} className={`rounded border px-1.5 py-px text-[11px] ${CHIP_TONES[tone]}`}>
          {prefix}
          {t}
        </span>
      ))}
      {items.length > max && (
        <span className="text-[11px] text-(--color-ink-faint) px-1">+{items.length - max}</span>
      )}
    </div>
  );
}

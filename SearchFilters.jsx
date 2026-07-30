'use client';

const PERIOD_OPTIONS = [
  { value: 'ALL', label: '전체 기간' },
  { value: '24', label: '오늘(24시간)' },
  { value: '72', label: '최근 3일' },
  { value: '168', label: '최근 7일' },
];

export default function SearchFilters({
  query,
  onQueryChange,
  period,
  onPeriodChange,
  category,
  onCategoryChange,
  feedId,
  onFeedIdChange,
  categories,
  feeds,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-2">
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="키워드로 검색…"
        className="flex-1 min-w-[160px] rounded border border-(--color-rule) px-3 py-1.5 text-sm bg-(--color-paper-raised) focus:border-(--color-wire-blue)"
      />

      <select
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="rounded border border-(--color-rule) px-2 py-1.5 text-xs bg-(--color-paper-raised) text-(--color-ink-soft) cursor-pointer"
      >
        {PERIOD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="rounded border border-(--color-rule) px-2 py-1.5 text-xs bg-(--color-paper-raised) text-(--color-ink-soft) cursor-pointer max-w-32"
      >
        <option value="ALL">전체 카테고리</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={feedId}
        onChange={(e) => onFeedIdChange(e.target.value)}
        className="rounded border border-(--color-rule) px-2 py-1.5 text-xs bg-(--color-paper-raised) text-(--color-ink-soft) cursor-pointer max-w-32"
      >
        <option value="ALL">전체 피드</option>
        {feeds.map((f) => (
          <option key={f.id} value={f.id}>
            {f.title}
          </option>
        ))}
      </select>
    </div>
  );
}

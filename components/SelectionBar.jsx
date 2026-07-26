'use client';

export default function SelectionBar({ allSelected, someSelected, onToggleAll, selectedCount, onBulkRead, onBulkUnread, busy }) {
  return (
    <div className="flex items-center gap-3 px-6 py-2 text-xs text-(--color-ink-soft)">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected && !allSelected;
          }}
          onChange={onToggleAll}
          className="w-4 h-4 accent-(--color-wire-blue) cursor-pointer"
        />
        전체 선택
      </label>

      {selectedCount > 0 && (
        <>
          <span className="font-(family-name:--font-mono)">{selectedCount}건 선택됨</span>
          <button
            onClick={onBulkRead}
            disabled={busy}
            className="rounded border border-(--color-rule) px-2.5 py-1 hover:border-(--color-wire-blue) hover:text-(--color-wire-blue) transition-colors cursor-pointer disabled:opacity-50"
          >
            읽음 처리
          </button>
          <button
            onClick={onBulkUnread}
            disabled={busy}
            className="rounded border border-(--color-rule) px-2.5 py-1 hover:border-(--color-wire-blue) hover:text-(--color-wire-blue) transition-colors cursor-pointer disabled:opacity-50"
          >
            읽지 않음으로 표시
          </button>
        </>
      )}
    </div>
  );
}

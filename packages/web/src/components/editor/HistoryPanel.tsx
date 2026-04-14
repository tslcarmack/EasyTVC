import { useImageEditorStore } from '../../stores/imageEditorStore';

export function HistoryPanel() {
  const { history, historyIndex, jumpToHistory } = useImageEditorStore();

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
          历史记录
        </span>
        <span className="text-[10px] text-[var(--color-text-secondary)]">
          {history.length}
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto px-2 pb-2">
        {history.length === 0 ? (
          <div className="py-4 text-center text-[10px] text-[var(--color-text-secondary)]">
            暂无历史
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {history.map((entry, idx) => (
              <button
                key={entry.id}
                onClick={() => jumpToHistory(idx)}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition ${
                  idx === historyIndex
                    ? 'bg-[var(--color-primary)]/15 text-white'
                    : idx > historyIndex
                      ? 'text-[var(--color-text-secondary)]/40 hover:bg-white/5'
                      : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
                }`}
              >
                <img
                  src={entry.thumbnail}
                  alt=""
                  className="h-7 w-7 rounded object-cover"
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-[11px]">{entry.action}</span>
                  <span className="text-[9px] text-[var(--color-text-secondary)]">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  ChevronDown,
  Copy,
  Download,
} from 'lucide-react';
import { useImageEditorStore } from '../../stores/imageEditorStore';

export function EditorHeader() {
  const { close, undo, redo, history, historyIndex, saveOverwrite, saveAsNewNode } =
    useImageEditorStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleDownload = useCallback(() => {
    const url = useImageEditorStore.getState().getCurrentImageDataUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `easytvc-edit-${Date.now()}.png`;
    a.click();
    setMenuOpen(false);
  }, []);

  return (
    <div className="flex h-11 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3">
      <div className="flex items-center gap-2">
        <button
          onClick={close}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text-secondary)] transition hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft size={14} />
          返回画布
        </button>

        <div className="mx-2 h-4 w-px bg-[var(--color-border)]" />

        <button
          onClick={undo}
          disabled={!canUndo}
          className="rounded-md p-1.5 text-[var(--color-text-secondary)] transition hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="rounded-md p-1.5 text-[var(--color-text-secondary)] transition hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="重做 (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>

        <span className="ml-2 text-[10px] text-[var(--color-text-secondary)]">
          {historyIndex + 1} / {history.length || 1}
        </span>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--color-primary)]/80"
        >
          <Save size={13} />
          保存
          <ChevronDown size={12} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 w-44 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
            <button
              onClick={() => {
                const url = useImageEditorStore.getState().getCurrentImageDataUrl();
                if (url) saveOverwrite(url);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:bg-white/5 hover:text-white"
            >
              <Save size={13} />
              覆盖原图
            </button>
            <button
              onClick={() => {
                const url = useImageEditorStore.getState().getCurrentImageDataUrl();
                if (url) saveAsNewNode(url);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:bg-white/5 hover:text-white"
            >
              <Copy size={13} />
              另存为新节点
            </button>
            <button
              onClick={handleDownload}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:bg-white/5 hover:text-white"
            >
              <Download size={13} />
              下载到本地
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

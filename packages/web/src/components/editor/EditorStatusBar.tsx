import { ZoomIn, ZoomOut } from 'lucide-react';
import { useImageEditorStore } from '../../stores/imageEditorStore';
import { getTool } from './tools/registry';

export function EditorStatusBar() {
  const { zoom, setZoom, canvasWidth, canvasHeight, activeTool } =
    useImageEditorStore();

  const tool = activeTool ? getTool(activeTool) : undefined;

  return (
    <div className="flex h-7 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3">
      <div className="text-[10px] text-[var(--color-text-secondary)]">
        {tool?.hint || 'Alt+拖拽 平移 · 滚轮缩放'}
      </div>

      <div className="flex items-center gap-2">
        {canvasWidth > 0 && (
          <span className="text-[10px] text-[var(--color-text-secondary)]">
            {canvasWidth} × {canvasHeight}
          </span>
        )}

        <div className="mx-1 h-3 w-px bg-[var(--color-border)]" />

        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="p-0.5 text-[var(--color-text-secondary)] transition hover:text-white"
        >
          <ZoomOut size={12} />
        </button>
        <span className="w-10 text-center text-[10px] text-[var(--color-text-secondary)]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="p-0.5 text-[var(--color-text-secondary)] transition hover:text-white"
        >
          <ZoomIn size={12} />
        </button>
      </div>
    </div>
  );
}

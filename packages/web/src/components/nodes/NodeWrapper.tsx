import { type ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Pencil, SquarePen } from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';

interface NodeWrapperProps {
  children: ReactNode;
  nodeId: string;
  title: string;
  icon: ReactNode;
  color?: string;
  isEditing?: boolean;
  promptBar?: ReactNode;
  topAction?: ReactNode;
  hoverActions?: ReactNode;
  onRename?: (newTitle: string) => void;
  minWidth?: number;
  minHeight?: number;
}

export function NodeWrapper({
  children,
  nodeId,
  title,
  icon,
  color = '#6366f1',
  isEditing = false,
  promptBar,
  topAction,
  hoverActions,
  onRename,
  minWidth = 200,
  minHeight = 100,
}: NodeWrapperProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    handle: string;
  } | null>(null);

  const setEditingNode = useCanvasStore((s) => s.setEditingNode);
  const updateNodeStyle = useCanvasStore((s) => s.updateNodeStyle);
  const reactFlow = useReactFlow();

  useEffect(() => {
    setRenameValue(title);
  }, [title]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameStart = useCallback(() => {
    setRenameValue(title);
    setIsRenaming(true);
  }, [title]);

  const handleRenameConfirm = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== title && onRename) {
      onRename(trimmed);
    }
    setIsRenaming(false);
  }, [renameValue, title, onRename]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        handleRenameConfirm();
      } else if (e.key === 'Escape') {
        setIsRenaming(false);
        setRenameValue(title);
      }
    },
    [handleRenameConfirm, title],
  );

  const handleEditClick = useCallback(() => {
    setEditingNode(nodeId);
  }, [nodeId, setEditingNode]);

  // ── Resize via drag ──

  const onResizeStart = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.preventDefault();
      e.stopPropagation();
      const el = containerRef.current;
      if (!el) return;

      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: el.offsetWidth,
        startH: el.offsetHeight,
        handle,
      };

      const onMove = (ev: MouseEvent) => {
        const r = resizeRef.current;
        if (!r) return;

        const zoom = reactFlow.getZoom();
        const dx = (ev.clientX - r.startX) / zoom;
        const dy = (ev.clientY - r.startY) / zoom;

        let newW = r.startW;
        let newH = r.startH;

        if (r.handle.includes('e')) newW = Math.max(minWidth, r.startW + dx);
        if (r.handle.includes('s')) newH = Math.max(minHeight, r.startH + dy);
        if (r.handle.includes('w')) newW = Math.max(minWidth, r.startW - dx);

        el.style.width = `${newW}px`;
        el.style.height = `${newH}px`;
      };

      const onUp = () => {
        const finalW = el.offsetWidth;
        const finalH = el.offsetHeight;
        resizeRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);

        updateNodeStyle(nodeId, finalW, finalH);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [minWidth, minHeight, reactFlow, nodeId],
  );

  const handleMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setIsHovered(false), 250);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`group/node relative rounded-xl border bg-[var(--color-surface)] shadow-lg overflow-visible transition-all duration-200 ${
        isEditing
          ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30'
          : 'border-[var(--color-border)]'
      }`}
      style={{ minWidth: `${minWidth}px` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Left connector */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-[var(--color-primary)] !border-[var(--color-surface)] !z-30"
      />

      {/* Top action (upload button) */}
      {isEditing && topAction && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
          {topAction}
        </div>
      )}

      {/* ── Hover toolbar ── */}
      {isHovered && !isEditing && (
        <div
          className="absolute right-2 z-20 flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1 shadow-xl"
          style={{ top: 0, transform: 'translateY(-100%)' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {hoverActions}
          <button
            onClick={handleEditClick}
            className="nodrag flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-secondary)] transition hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
            title="编辑节点"
          >
            <SquarePen size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white"
        style={{ backgroundColor: color + '20', borderBottom: `1px solid ${color}30` }}
      >
        {icon}
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameConfirm}
            onKeyDown={handleRenameKeyDown}
            className="nodrag w-full bg-transparent text-xs font-medium text-white outline-none border-b border-white/30 focus:border-[var(--color-primary)]"
          />
        ) : (
          <span
            className="flex-1 truncate cursor-default"
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleRenameStart();
            }}
          >
            {title}
          </span>
        )}
        {isEditing && !isRenaming && (
          <button
            onClick={handleRenameStart}
            className="nodrag rounded p-0.5 text-white/40 hover:text-white transition"
            title="重命名"
          >
            <Pencil size={10} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 overflow-auto" style={{ maxHeight: 'calc(100% - 40px)' }}>
        {children}
      </div>

      {/* Prompt bar (only in edit mode) */}
      {isEditing && promptBar && (
        <div className="border-t border-[var(--color-border)]">
          {promptBar}
        </div>
      )}

      {/* Right connector */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[var(--color-primary)] !border-[var(--color-surface)] !z-30"
      />

      {/* ── Resize handles (positioned away from connection handles) ── */}
      {/* Bottom edge */}
      <div
        className="nodrag nopan absolute -bottom-[4px] left-4 right-4 h-[8px] cursor-s-resize opacity-0 hover:opacity-100 group-hover/node:opacity-40 transition-opacity"
        onMouseDown={(e) => onResizeStart(e, 's')}
      >
        <div className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-[var(--color-primary)]" />
      </div>
      {/* Bottom-right corner */}
      <div
        className="nodrag nopan absolute -bottom-[5px] -right-[5px] h-[14px] w-[14px] cursor-se-resize opacity-0 hover:opacity-100 group-hover/node:opacity-60 transition-opacity"
        onMouseDown={(e) => onResizeStart(e, 'se')}
      >
        <div className="absolute bottom-[2px] right-[2px] h-[8px] w-[8px] rounded-br-md border-b-2 border-r-2 border-[var(--color-primary)]" />
      </div>
    </div>
  );
}

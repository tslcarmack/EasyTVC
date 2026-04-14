import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import { Frame, Pencil } from 'lucide-react';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';

const FRAME_COLORS = [
  { name: 'Purple', value: '#6366f1' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Pink', value: '#ec4899' },
];

export const FrameNodeComponent = memo(function FrameNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState((nodeData.label as string) || 'Scene');
  const inputRef = useRef<HTMLInputElement>(null);

  const color = (nodeData.frameColor as string) || FRAME_COLORS[0].value;

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameConfirm = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== nodeData.label) {
      updateNodeData(id, { label: trimmed });
    }
    setIsRenaming(false);
  }, [id, renameValue, nodeData.label, updateNodeData]);

  const handleColorChange = useCallback(
    (newColor: string) => {
      updateNodeData(id, { frameColor: newColor });
    },
    [id, updateNodeData],
  );

  return (
    <>
      <NodeResizer
        minWidth={300}
        minHeight={200}
        isVisible={selected}
        lineClassName="!border-[var(--color-primary)]"
        handleClassName="!w-2.5 !h-2.5 !bg-[var(--color-primary)] !border-[var(--color-surface)]"
      />

      <div
        className="h-full w-full rounded-xl"
        style={{
          border: `2px dashed ${color}40`,
          backgroundColor: `${color}08`,
        }}
      >
        {/* Frame header */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ borderBottom: `1px solid ${color}20` }}
        >
          <Frame size={14} style={{ color }} />

          {isRenaming ? (
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameConfirm}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleRenameConfirm();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              className="nodrag w-full bg-transparent text-sm font-medium text-white outline-none border-b border-white/30"
            />
          ) : (
            <span
              className="flex-1 text-sm font-medium cursor-default"
              style={{ color }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setRenameValue((nodeData.label as string) || 'Scene');
                setIsRenaming(true);
              }}
            >
              {nodeData.label || 'Scene'}
            </span>
          )}

          {selected && !isRenaming && (
            <div className="flex items-center gap-1">
              {FRAME_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => handleColorChange(c.value)}
                  className={`h-3.5 w-3.5 rounded-full border transition ${
                    color === c.value ? 'border-white scale-125' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}

              <button
                onClick={() => {
                  setRenameValue((nodeData.label as string) || 'Scene');
                  setIsRenaming(true);
                }}
                className="ml-1 rounded p-0.5 text-white/40 hover:text-white transition"
              >
                <Pencil size={10} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

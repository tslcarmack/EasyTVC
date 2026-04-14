import { useState, useCallback } from 'react';
import { Bookmark, Plus, X, Image, Film, Type, AudioLines, Palette, User, Sparkles } from 'lucide-react';
import { NodeType } from '@easytvc/shared';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';
import type { Node } from '@xyflow/react';

export interface NodeReference {
  nodeId: string;
  nodeType: NodeType;
  label: string;
  src?: string;
  content?: string;
}

interface ReferenceSelectorProps {
  currentNodeId: string;
  references: NodeReference[];
  onAdd: (ref: NodeReference) => void;
  onRemove: (nodeId: string) => void;
  allowedTypes?: NodeType[];
}

const typeIcons: Record<string, React.ElementType> = {
  [NodeType.TEXT]: Type,
  [NodeType.IMAGE]: Image,
  [NodeType.VIDEO]: Film,
  [NodeType.AUDIO]: AudioLines,
  [NodeType.IMAGE_EDITOR]: Palette,
  [NodeType.CHARACTER]: User,
  [NodeType.STYLE]: Sparkles,
};

const typeLabels: Record<string, string> = {
  [NodeType.TEXT]: 'Text',
  [NodeType.IMAGE]: 'Image',
  [NodeType.VIDEO]: 'Video',
  [NodeType.AUDIO]: 'Audio',
  [NodeType.IMAGE_EDITOR]: 'Doodle',
  [NodeType.CHARACTER]: '角色',
  [NodeType.STYLE]: '风格',
};

function getNodePreview(node: Node<EasyTVCNodeData>): string {
  const data = node.data;
  if (data.content) {
    const text = data.content as string;
    return text.length > 30 ? text.slice(0, 30) + '...' : text;
  }
  if (data.fileName) return data.fileName as string;
  if (data.src) return '(has media)';
  return '(empty)';
}

export function ReferenceSelector({
  currentNodeId,
  references,
  onAdd,
  onRemove,
  allowedTypes,
}: ReferenceSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const nodes = useCanvasStore((s) => s.nodes);

  const availableNodes = nodes.filter((n: Node<EasyTVCNodeData>) => {
    if (n.id === currentNodeId) return false;
    if (references.some((r) => r.nodeId === n.id)) return false;
    if (allowedTypes && !allowedTypes.includes(n.data.nodeType)) return false;
    return true;
  });

  const handleSelect = useCallback(
    (node: Node<EasyTVCNodeData>) => {
      onAdd({
        nodeId: node.id,
        nodeType: node.data.nodeType,
        label: node.data.label,
        src: node.data.src as string | undefined,
        content: node.data.content as string | undefined,
      });
      setShowPicker(false);
    },
    [onAdd],
  );

  return (
    <div className="relative flex items-center gap-1">
      {/* Reference button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition ${
          references.length > 0
            ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
            : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface-hover)]'
        }`}
        title="Add reference"
      >
        <Bookmark size={14} />
      </button>

      {/* Add button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center justify-center rounded-md px-1.5 py-1 text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface-hover)] transition"
      >
        <Plus size={14} />
      </button>

      {/* Reference chips */}
      {references.map((ref) => {
        const Icon = typeIcons[ref.nodeType] || Type;
        return (
          <div
            key={ref.nodeId}
            className="flex items-center gap-1 rounded-md bg-[var(--color-bg)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)]"
            title={ref.label}
          >
            <Icon size={10} />
            <span className="max-w-[80px] truncate">{ref.label}</span>
            <button
              onClick={() => onRemove(ref.nodeId)}
              className="hover:text-white transition"
            >
              <X size={10} />
            </button>
          </div>
        );
      })}

      {/* Picker dropdown */}
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-1 z-50 min-w-[260px] max-h-[240px] overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-xl">
          {availableNodes.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">
              No available nodes
            </div>
          ) : (
            availableNodes.map((node: Node<EasyTVCNodeData>) => {
              const Icon = typeIcons[node.data.nodeType] || Type;
              const preview = getNodePreview(node);
              const typeLabel = typeLabels[node.data.nodeType] || node.data.nodeType;
              return (
                <button
                  key={node.id}
                  onClick={() => handleSelect(node)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface-hover)] transition"
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-[var(--color-bg)]">
                    <Icon size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium text-[var(--color-text)]">
                      {node.data.label}
                    </div>
                    <div className="truncate text-[10px] opacity-60">
                      {preview}
                    </div>
                  </div>
                  <span className="flex-shrink-0 rounded bg-[var(--color-bg)] px-1.5 py-0.5 text-[10px] opacity-50">
                    {typeLabel}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

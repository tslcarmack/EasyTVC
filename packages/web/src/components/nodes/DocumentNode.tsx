import { memo, useState, useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';
import { NodeWrapper } from './NodeWrapper';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';

export const DocumentNodeComponent = memo(function DocumentNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { content: e.target.value });
    },
    [id, updateNodeData],
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { fileName: e.target.value });
    },
    [id, updateNodeData],
  );

  const handleRename = useCallback(
    (newTitle: string) => {
      updateNodeData(id, { label: newTitle });
    },
    [id, updateNodeData],
  );

  return (
    <NodeWrapper nodeId={id} title={nodeData.label || 'Document'} icon={<FileText size={14} />} color="#ec4899" onRename={handleRename}>
      <div className="nodrag">
        <input
          type="text"
          value={nodeData.fileName || ''}
          onChange={handleTitleChange}
          placeholder="Document title..."
          className="mb-2 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs text-white outline-none focus:border-[var(--color-primary)]"
        />
        {isEditing ? (
          <textarea
            value={nodeData.content || ''}
            onChange={handleChange}
            onBlur={() => setIsEditing(false)}
            autoFocus
            className="nowheel min-h-[100px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-sm text-white outline-none focus:border-[var(--color-primary)]"
            placeholder="Write your document content..."
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="min-h-[100px] cursor-text whitespace-pre-wrap rounded-lg p-2 text-sm text-[var(--color-text)]"
          >
            {nodeData.content || (
              <span className="text-[var(--color-text-secondary)]">Click to edit...</span>
            )}
          </div>
        )}
      </div>
    </NodeWrapper>
  );
});

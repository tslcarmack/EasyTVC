import { memo, useState, useCallback, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Image, Upload, Loader2, Paintbrush } from 'lucide-react';
import { GenerationType, getModelsForType, NodeType } from '@easytvc/shared';
import { NodeWrapper } from './NodeWrapper';
import { NodePromptBar } from './NodePromptBar';
import { ReferenceSelector, type NodeReference } from './ReferenceSelector';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';
import { useGenerationStore } from '../../stores/generationStore';
import { useImageEditorStore } from '../../stores/imageEditorStore';
import { getAccessToken } from '../../api/client';

const ASPECT_RATIOS = [
  { label: '1:1', width: 1024, height: 1024 },
  { label: '16:9', width: 1792, height: 1024 },
  { label: '9:16', width: 1024, height: 1792 },
  { label: '4:3', width: 1365, height: 1024 },
] as const;

export const ImageNodeComponent = memo(function ImageNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const { generateForNode } = useGenerationStore();

  const [uploading, setUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState((nodeData.lastModel as string) || '');
  const [aspectIdx, setAspectIdx] = useState(0);
  const [references, setReferences] = useState<NodeReference[]>([]);

  const openImageEditor = useImageEditorStore((s) => s.open);

  const isEditing = editingNodeId === id;
  const isGenerating = nodeData.generationStatus === 'generating';
  const models = useMemo(() => getModelsForType(GenerationType.TEXT_TO_IMAGE), []);

  const handleOpenEditor = useCallback(() => {
    if (nodeData.src) {
      openImageEditor(id, nodeData.src as string);
    }
  }, [id, nodeData.src, openImageEditor]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${getAccessToken()}` },
          body: formData,
        });
        const json = await res.json();
        if (json.success && json.data) {
          updateNodeData(id, { src: json.data.url, label: nodeData.label === 'Image' ? file.name : nodeData.label });
        }
      } finally {
        setUploading(false);
      }
    },
    [id, nodeData.label, updateNodeData],
  );

  const handleGenerate = useCallback(
    (prompt: string) => {
      const ratio = ASPECT_RATIOS[aspectIdx];

      const imageUrls = references
        .filter((r) => r.nodeType === NodeType.IMAGE && r.src)
        .map((r) => r.src!);

      generateForNode(id, GenerationType.TEXT_TO_IMAGE, prompt, {
        model: selectedModel || undefined,
        width: ratio.width,
        height: ratio.height,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
    },
    [id, selectedModel, aspectIdx, references, generateForNode],
  );

  const handleAddRef = useCallback((ref: NodeReference) => {
    setReferences((prev) => [...prev, ref]);
  }, []);

  const handleRemoveRef = useCallback((nodeId: string) => {
    setReferences((prev) => prev.filter((r) => r.nodeId !== nodeId));
  }, []);

  const handleRename = useCallback(
    (newTitle: string) => {
      updateNodeData(id, { label: newTitle });
    },
    [id, updateNodeData],
  );

  const uploadButton = (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] shadow-md transition hover:text-white hover:border-[var(--color-primary)]">
      <Upload size={12} />
      上传
      <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </label>
  );

  const configSlot = (
    <div className="flex items-center gap-1">
      {ASPECT_RATIOS.map((r, i) => (
        <button
          key={r.label}
          onClick={() => setAspectIdx(i)}
          className={`rounded px-1.5 py-0.5 text-[10px] transition ${
            i === aspectIdx
              ? 'bg-[var(--color-primary)]/20 text-white'
              : 'text-[var(--color-text-secondary)] hover:text-white'
          }`}
        >
          {r.label}
        </button>
      ))}
      <span className="text-[10px] text-[var(--color-text-secondary)]">· 2K</span>
    </div>
  );

  const leftSlot = (
    <ReferenceSelector
      currentNodeId={id}
      references={references}
      onAdd={handleAddRef}
      onRemove={handleRemoveRef}
      allowedTypes={[NodeType.TEXT, NodeType.IMAGE]}
    />
  );

  const promptBar = (
    <NodePromptBar
      placeholder="描述任何你想要生成的内容"
      models={models}
      selectedModel={selectedModel || models[0]?.id || ''}
      onModelChange={setSelectedModel}
      onSubmit={handleGenerate}
      isGenerating={isGenerating}
      configSlot={configSlot}
      leftSlot={leftSlot}
      credits={5}
      initialPrompt={(nodeData.lastPrompt as string) || ''}
    />
  );

  return (
    <NodeWrapper
      nodeId={id}
      title={nodeData.label || 'Image'}
      icon={<Image size={14} />}
      color="#22c55e"
      isEditing={isEditing}
      promptBar={promptBar}
      topAction={uploadButton}
      onRename={handleRename}
    >
      {isGenerating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
            <span className="text-xs text-white">Generating...</span>
          </div>
        </div>
      )}

      {nodeData.generationError && (
        <div className="mb-2 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-400">
          {nodeData.generationError}
        </div>
      )}

      {nodeData.src ? (
        <div className="nodrag">
          <img
            src={nodeData.src as string}
            alt={nodeData.label || 'Image'}
            className="w-full rounded-lg object-contain"
          />
          {isEditing && (
            <div className="mt-2 flex items-center gap-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] py-1.5 text-xs text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-white">
                <Upload size={12} />
                替换
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
              <button
                onClick={handleOpenEditor}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] py-1.5 text-xs text-[var(--color-text-secondary)] transition hover:border-purple-500 hover:text-purple-400"
              >
                <Paintbrush size={12} />
                编辑图片
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="nodrag flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)]">
          {uploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          ) : (
            <>
              <Image size={32} className="text-[var(--color-text-secondary)]/40" />
              {isEditing && (
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Upload or generate with AI
                </span>
              )}
            </>
          )}
        </div>
      )}
    </NodeWrapper>
  );
});

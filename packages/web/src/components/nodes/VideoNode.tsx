import { memo, useState, useCallback, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Film, Upload, Loader2, Play, Settings2 } from 'lucide-react';
import { GenerationType, getModelsForType, NodeType } from '@easytvc/shared';
import { NodeWrapper } from './NodeWrapper';
import { NodePromptBar } from './NodePromptBar';
import { ReferenceSelector, type NodeReference } from './ReferenceSelector';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';
import { useGenerationStore } from '../../stores/generationStore';
import { getAccessToken } from '../../api/client';

const ASPECT_RATIOS = [
  { label: '16:9', width: 1920, height: 1080 },
  { label: '9:16', width: 1080, height: 1920 },
  { label: '1:1', width: 1080, height: 1080 },
] as const;

const DURATIONS = [5, 10] as const;

export const VideoNodeComponent = memo(function VideoNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const { generateForNode } = useGenerationStore();

  const [uploading, setUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState((nodeData.lastModel as string) || '');
  const [aspectIdx, setAspectIdx] = useState(0);
  const [durationIdx, setDurationIdx] = useState(0);
  const [references, setReferences] = useState<NodeReference[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const isEditing = editingNodeId === id;
  const isGenerating = nodeData.generationStatus === 'generating';

  const hasImageRef = references.some((r) => r.nodeType === NodeType.IMAGE);
  const genType = hasImageRef ? GenerationType.IMAGE_TO_VIDEO : GenerationType.TEXT_TO_VIDEO;
  const models = useMemo(() => getModelsForType(genType), [genType]);

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
          updateNodeData(id, { src: json.data.url, label: file.name });
        }
      } finally {
        setUploading(false);
      }
    },
    [id, updateNodeData],
  );

  const handleGenerate = useCallback(
    (prompt: string) => {
      const ratio = ASPECT_RATIOS[aspectIdx];
      const imageRefs = references.filter((r) => r.nodeType === NodeType.IMAGE && r.src);

      const firstImage = imageRefs[0]?.src;
      const endImage = imageRefs.length >= 2 ? imageRefs[1]?.src : undefined;

      generateForNode(id, genType, prompt, {
        model: selectedModel || undefined,
        width: ratio.width,
        height: ratio.height,
        duration: DURATIONS[durationIdx],
        imageUrl: firstImage,
        endImageUrl: endImage,
      });
    },
    [id, selectedModel, aspectIdx, durationIdx, references, genType, generateForNode],
  );

  const handleAddRef = useCallback((ref: NodeReference) => {
    setReferences((prev) => [...prev, ref]);
  }, []);

  const handleRemoveRef = useCallback((nodeId: string) => {
    setReferences((prev) => prev.filter((r) => r.nodeId !== nodeId));
  }, []);

  const uploadButton = (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] shadow-md transition hover:text-white hover:border-[var(--color-primary)]">
      <Upload size={12} />
      上传
      <input type="file" accept="video/*" onChange={handleUpload} className="hidden" />
    </label>
  );

  const leftSlot = (
    <div className="flex items-center gap-1">
      <ReferenceSelector
        currentNodeId={id}
        references={references}
        onAdd={handleAddRef}
        onRemove={handleRemoveRef}
        allowedTypes={[NodeType.IMAGE, NodeType.TEXT]}
      />
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`flex items-center justify-center rounded-md px-1.5 py-1 transition ${
          showSettings
            ? 'text-white bg-[var(--color-surface-hover)]'
            : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface-hover)]'
        }`}
      >
        <Settings2 size={14} />
      </button>
    </div>
  );

  const imageRefCount = references.filter((r) => r.nodeType === NodeType.IMAGE).length;

  const configSlot = (
    <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)]">
      {imageRefCount >= 2 ? (
        <span className="text-[var(--color-primary)]">首尾帧</span>
      ) : imageRefCount === 1 ? (
        <span className="text-[var(--color-primary)]">首帧</span>
      ) : (
        <span>纯文生</span>
      )}
      <span>·</span>
      {ASPECT_RATIOS.map((r, i) => (
        <button
          key={r.label}
          onClick={() => setAspectIdx(i)}
          className={`rounded px-1 py-0.5 transition ${
            i === aspectIdx ? 'bg-[var(--color-primary)]/20 text-white' : 'hover:text-white'
          }`}
        >
          {r.label}
        </button>
      ))}
      <span>·</span>
      <span>1080p</span>
      <span>·</span>
      {DURATIONS.map((d, i) => (
        <button
          key={d}
          onClick={() => setDurationIdx(i)}
          className={`rounded px-1 py-0.5 transition ${
            i === durationIdx ? 'bg-[var(--color-primary)]/20 text-white' : 'hover:text-white'
          }`}
        >
          {d}s
        </button>
      ))}
    </div>
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
      credits={112}
      initialPrompt={(nodeData.lastPrompt as string) || ''}
    />
  );

  const handleRename = useCallback(
    (newTitle: string) => {
      updateNodeData(id, { label: newTitle });
    },
    [id, updateNodeData],
  );

  return (
    <NodeWrapper
      nodeId={id}
      title={nodeData.label || 'Video'}
      icon={<Film size={14} />}
      color="#f59e0b"
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
        <div className="nodrag relative">
          <video
            src={nodeData.src as string}
            controls={isEditing}
            className="w-full rounded-lg"
          />
          {!isEditing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-black/40 p-2">
                <Play size={20} className="text-white/80" />
              </div>
            </div>
          )}
          {isEditing && (
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] py-1.5 text-xs text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-white">
              <Upload size={12} />
              Replace
              <input type="file" accept="video/*" onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>
      ) : (
        <div className="nodrag flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)]">
          {uploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          ) : (
            <>
              <Play size={32} className="text-[var(--color-text-secondary)]/40" />
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

import { memo, useState, useCallback, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { AudioLines, Upload, Loader2 } from 'lucide-react';
import { GenerationType, getModelsForType } from '@easytvc/shared';
import { NodeWrapper } from './NodeWrapper';
import { NodePromptBar } from './NodePromptBar';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';
import { useGenerationStore } from '../../stores/generationStore';
import { getAccessToken } from '../../api/client';

const VOICES = [
  { id: 'roger', name: 'Roger' },
  { id: 'sarah', name: 'Sarah' },
  { id: 'charlie', name: 'Charlie' },
  { id: 'emily', name: 'Emily' },
  { id: 'adam', name: 'Adam' },
] as const;

export const AudioNodeComponent = memo(function AudioNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const { generateForNode } = useGenerationStore();

  const [uploading, setUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState((nodeData.lastModel as string) || '');
  const [selectedVoice, setSelectedVoice] = useState((nodeData.voiceId as string) || 'roger');

  const isEditing = editingNodeId === id;
  const isGenerating = nodeData.generationStatus === 'generating';
  const models = useMemo(() => getModelsForType(GenerationType.TEXT_TO_AUDIO), []);

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
      generateForNode(id, GenerationType.TEXT_TO_AUDIO, prompt, {
        model: selectedModel || undefined,
        voiceId: selectedVoice,
      });
    },
    [id, selectedModel, selectedVoice, generateForNode],
  );

  const uploadButton = (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] shadow-md transition hover:text-white hover:border-[var(--color-primary)]">
      <Upload size={12} />
      上传
      <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
    </label>
  );

  const configSlot = (
    <div className="flex items-center gap-1 text-[10px]">
      <span className="text-[var(--color-text-secondary)]">文字转语音</span>
      <span className="text-[var(--color-text-secondary)]">·</span>
      <select
        value={selectedVoice}
        onChange={(e) => setSelectedVoice(e.target.value)}
        className="rounded bg-transparent px-1 py-0.5 text-[10px] text-[var(--color-text-secondary)] outline-none hover:text-white"
      >
        {VOICES.map((v) => (
          <option key={v.id} value={v.id} className="bg-[var(--color-surface)]">
            {v.name}
          </option>
        ))}
      </select>
    </div>
  );

  const promptBar = (
    <NodePromptBar
      placeholder="输入文本将其转换为富有表现力的语音"
      models={models}
      selectedModel={selectedModel || models[0]?.id || ''}
      onModelChange={setSelectedModel}
      onSubmit={handleGenerate}
      isGenerating={isGenerating}
      configSlot={configSlot}
      credits={5}
      creditsUnit="百字符"
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
      title={nodeData.label || 'Audio'}
      icon={<AudioLines size={14} />}
      color="#8b5cf6"
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
          {isEditing ? (
            <audio
              src={nodeData.src as string}
              controls
              className="w-full"
            />
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--color-bg)] px-3 py-2">
              <AudioLines size={16} className="text-[var(--color-primary)]" />
              <span className="text-xs text-white flex-1 truncate">{nodeData.label || 'Audio'}</span>
              <span className="text-[10px] text-[var(--color-text-secondary)]">已生成</span>
            </div>
          )}
          {isEditing && (
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] py-1.5 text-xs text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-white">
              <Upload size={12} />
              Replace
              <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>
      ) : (
        <div className="nodrag flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)]">
          {uploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          ) : (
            <>
              <AudioLines size={32} className="text-[var(--color-text-secondary)]/40" />
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

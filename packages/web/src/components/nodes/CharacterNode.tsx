import { memo, useState, useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { User, Upload, Loader2, Sparkles, X, Plus } from 'lucide-react';
import { GenerationType, getModelsForType, NodeType } from '@easytvc/shared';
import { NodeWrapper } from './NodeWrapper';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';
import { useGenerationStore } from '../../stores/generationStore';
import { getAccessToken } from '../../api/client';

export const CharacterNodeComponent = memo(function CharacterNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const { generateForNode } = useGenerationStore();

  const [uploading, setUploading] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const isEditing = editingNodeId === id;
  const refImages = (nodeData.referenceImages as string[]) || [];
  const charName = (nodeData.characterName as string) || '';
  const description = (nodeData.description as string) || '';
  const aiDescription = (nodeData.aiDescription as string) || '';

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      setUploading(true);
      const newUrls: string[] = [];

      for (const file of files) {
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
            newUrls.push(json.data.url);
          }
        } catch {
          // skip failed upload
        }
      }

      if (newUrls.length > 0) {
        updateNodeData(id, { referenceImages: [...refImages, ...newUrls] });
      }
      setUploading(false);
      e.target.value = '';
    },
    [id, refImages, updateNodeData],
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      const next = refImages.filter((_, i) => i !== index);
      updateNodeData(id, { referenceImages: next });
    },
    [id, refImages, updateNodeData],
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { characterName: e.target.value, label: e.target.value || 'Character' });
    },
    [id, updateNodeData],
  );

  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { description: e.target.value });
    },
    [id, updateNodeData],
  );

  const handleGenerateAiDesc = useCallback(async () => {
    if (refImages.length === 0 && !description) return;
    setGeneratingDesc(true);

    const prompt = `Based on the following character information, generate a detailed English appearance description suitable for AI image generation. Include: gender, age range, ethnicity/skin tone, hairstyle and color, facial features, body type, clothing, accessories, and overall vibe. Be specific and concise (2-3 sentences).

Character name: ${charName || 'unnamed'}
User description: ${description || 'See reference images'}`;

    const result = await generateForNode(id, GenerationType.TEXT_TO_TEXT, prompt, {
      imageUrls: refImages.length > 0 ? refImages : undefined,
    });

    if (result?.resultText) {
      updateNodeData(id, { aiDescription: result.resultText, generationStatus: 'idle' });
    }
    setGeneratingDesc(false);
  }, [id, charName, description, refImages, generateForNode, updateNodeData]);

  const handleRename = useCallback(
    (newTitle: string) => {
      updateNodeData(id, { label: newTitle, characterName: newTitle });
    },
    [id, updateNodeData],
  );

  return (
    <NodeWrapper
      nodeId={id}
      title={charName || nodeData.label || 'Character'}
      icon={<User size={14} />}
      color="#ec4899"
      isEditing={isEditing}
      onRename={handleRename}
    >
      {/* Reference images grid */}
      <div className="mb-2">
        <div className="mb-1 text-[10px] font-medium text-[var(--color-text-secondary)]">参考图片</div>
        <div className="grid grid-cols-3 gap-1.5">
          {refImages.map((url, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--color-border)]">
              <img src={url} alt="" className="h-full w-full object-cover" />
              {isEditing && (
                <button
                  onClick={() => handleRemoveImage(i)}
                  className="absolute right-0.5 top-0.5 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:block"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          {isEditing && (
            <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-white">
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>
        {refImages.length === 0 && !isEditing && (
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
            无参考图
          </div>
        )}
      </div>

      {/* Character name */}
      {isEditing && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] font-medium text-[var(--color-text-secondary)]">角色名称</div>
          <input
            value={charName}
            onChange={handleNameChange}
            placeholder="如：咖啡师小明"
            className="nodrag w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-white outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      )}

      {/* Description */}
      <div className="mb-2">
        <div className="mb-1 text-[10px] font-medium text-[var(--color-text-secondary)]">外观描述</div>
        {isEditing ? (
          <textarea
            value={description}
            onChange={handleDescChange}
            placeholder="描述角色外观：性别、年龄、发型、服装等..."
            className="nodrag nowheel min-h-[60px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs text-white outline-none focus:border-[var(--color-primary)]"
          />
        ) : (
          <div className="min-h-[40px] rounded-lg p-2 text-xs text-[var(--color-text)]">
            {description || <span className="text-[var(--color-text-secondary)]">未设定</span>}
          </div>
        )}
      </div>

      {/* AI Description */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">AI 精炼描述</span>
          {isEditing && (
            <button
              onClick={handleGenerateAiDesc}
              disabled={generatingDesc || (refImages.length === 0 && !description)}
              className="nodrag flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition disabled:opacity-40"
            >
              {generatingDesc ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              生成
            </button>
          )}
        </div>
        <div className="rounded-lg bg-[var(--color-bg)] p-2 text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
          {aiDescription || '点击"生成"按钮，AI 将根据参考图和描述自动生成英文外观描述'}
        </div>
      </div>
    </NodeWrapper>
  );
});

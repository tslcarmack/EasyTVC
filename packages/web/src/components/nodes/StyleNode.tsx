import { memo, useState, useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Palette, Upload, Loader2, X, Plus, Tag } from 'lucide-react';
import { NodeType } from '@easytvc/shared';
import { NodeWrapper } from './NodeWrapper';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';
import { getAccessToken } from '../../api/client';

const PRESET_STYLES = [
  { label: '电影感', keywords: ['cinematic', 'dramatic lighting', 'shallow DOF'] },
  { label: '动画风', keywords: ['anime style', 'cel shading', 'vibrant colors'] },
  { label: '写实', keywords: ['photorealistic', 'high detail', 'natural lighting'] },
  { label: '扁平插画', keywords: ['flat illustration', 'clean lines', 'minimal'] },
  { label: '赛博朋克', keywords: ['cyberpunk', 'neon', 'futuristic', 'dark atmosphere'] },
  { label: '暖色调', keywords: ['warm tones', 'golden hour', 'soft light'] },
];

export const StyleNodeComponent = memo(function StyleNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const [uploading, setUploading] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const isEditing = editingNodeId === id;
  const refImages = (nodeData.referenceImages as string[]) || [];
  const description = (nodeData.description as string) || '';
  const keywords = (nodeData.keywords as string[]) || [];

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
          // skip
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
      updateNodeData(id, { referenceImages: refImages.filter((_, i) => i !== index) });
    },
    [id, refImages, updateNodeData],
  );

  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { description: e.target.value });
    },
    [id, updateNodeData],
  );

  const handleAddKeyword = useCallback(
    (kw: string) => {
      const trimmed = kw.trim();
      if (trimmed && !keywords.includes(trimmed)) {
        updateNodeData(id, { keywords: [...keywords, trimmed] });
      }
      setNewKeyword('');
    },
    [id, keywords, updateNodeData],
  );

  const handleRemoveKeyword = useCallback(
    (kw: string) => {
      updateNodeData(id, { keywords: keywords.filter((k) => k !== kw) });
    },
    [id, keywords, updateNodeData],
  );

  const handleApplyPreset = useCallback(
    (preset: (typeof PRESET_STYLES)[number]) => {
      const merged = [...new Set([...keywords, ...preset.keywords])];
      updateNodeData(id, { keywords: merged, label: preset.label });
    },
    [id, keywords, updateNodeData],
  );

  const handleKeywordKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        handleAddKeyword(newKeyword);
      }
    },
    [newKeyword, handleAddKeyword],
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
      title={nodeData.label || 'Style'}
      icon={<Palette size={14} />}
      color="#8b5cf6"
      isEditing={isEditing}
      onRename={handleRename}
    >
      {/* Reference images */}
      <div className="mb-2">
        <div className="mb-1 text-[10px] font-medium text-[var(--color-text-secondary)]">风格参考图</div>
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
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mb-2">
        <div className="mb-1 text-[10px] font-medium text-[var(--color-text-secondary)]">风格描述</div>
        {isEditing ? (
          <textarea
            value={description}
            onChange={handleDescChange}
            placeholder="描述你想要的画面风格..."
            className="nodrag nowheel min-h-[50px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs text-white outline-none focus:border-[var(--color-primary)]"
          />
        ) : (
          <div className="min-h-[30px] rounded-lg p-2 text-xs text-[var(--color-text)]">
            {description || <span className="text-[var(--color-text-secondary)]">未设定</span>}
          </div>
        )}
      </div>

      {/* Keywords */}
      <div className="mb-2">
        <div className="mb-1 text-[10px] font-medium text-[var(--color-text-secondary)]">风格标签</div>
        <div className="flex flex-wrap gap-1">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] text-[var(--color-primary)]"
            >
              <Tag size={8} />
              {kw}
              {isEditing && (
                <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-red-400">
                  <X size={8} />
                </button>
              )}
            </span>
          ))}
          {isEditing && (
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              onBlur={() => newKeyword && handleAddKeyword(newKeyword)}
              placeholder="+ 添加标签"
              className="nodrag w-20 rounded-full border border-[var(--color-border)] bg-transparent px-2 py-0.5 text-[10px] text-white outline-none focus:border-[var(--color-primary)]"
            />
          )}
        </div>
      </div>

      {/* Preset styles */}
      {isEditing && (
        <div>
          <div className="mb-1 text-[10px] font-medium text-[var(--color-text-secondary)]">快速预设</div>
          <div className="flex flex-wrap gap-1">
            {PRESET_STYLES.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleApplyPreset(preset)}
                className="nodrag rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-white"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </NodeWrapper>
  );
});

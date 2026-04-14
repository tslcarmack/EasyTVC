import { memo, useState, useCallback, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import {
  Type,
  Bold,
  Italic,
  List,
  ListOrdered,
  Minus,
  Copy,
  Maximize2,
  Loader2,
  Zap,
} from 'lucide-react';
import { GenerationType, getModelsForType } from '@easytvc/shared';
import { NodeWrapper } from './NodeWrapper';
import { NodePromptBar } from './NodePromptBar';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';
import { useGenerationStore } from '../../stores/generationStore';

export const TextNodeComponent = memo(function TextNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setPipelineNode = useCanvasStore((s) => s.setPipelineNode);
  const { generateForNode } = useGenerationStore();
  const [selectedModel, setSelectedModel] = useState((nodeData.lastModel as string) || '');

  const isEditing = editingNodeId === id;
  const isGenerating = nodeData.generationStatus === 'generating';
  const models = useMemo(() => getModelsForType(GenerationType.TEXT_TO_TEXT), []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { content: e.target.value });
    },
    [id, updateNodeData],
  );

  const handleCopy = useCallback(() => {
    if (nodeData.content) {
      navigator.clipboard.writeText(nodeData.content as string);
    }
  }, [nodeData.content]);

  const handleGenerate = useCallback(
    (prompt: string) => {
      generateForNode(id, GenerationType.TEXT_TO_TEXT, prompt, {
        model: selectedModel || undefined,
      });
    },
    [id, selectedModel, generateForNode],
  );

  const handleOpenPipeline = useCallback(() => {
    setPipelineNode(id);
  }, [id, setPipelineNode]);

  const pipelineHoverAction = nodeData.content ? (
    <button
      onClick={handleOpenPipeline}
      className="nodrag flex items-center gap-1 rounded-md px-2 py-1 text-xs text-amber-400 transition hover:bg-amber-500/10 hover:text-amber-300"
      title="一键成片：从脚本自动生成分镜、视频、音频"
    >
      <Zap size={13} />
    </button>
  ) : null;

  const formatToolbar = isEditing ? (
    <div className="nodrag mb-2 flex items-center gap-0.5 rounded-lg bg-[var(--color-bg)] p-1">
      {[
        { label: 'H1', action: () => {} },
        { label: 'H2', action: () => {} },
        { label: 'H3', action: () => {} },
        { label: 'P', action: () => {}, active: true },
      ].map((btn) => (
        <button
          key={btn.label}
          onClick={btn.action}
          className={`rounded px-2 py-1 text-[10px] font-medium transition ${
            btn.active
              ? 'bg-[var(--color-surface-hover)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-white'
          }`}
        >
          {btn.label}
        </button>
      ))}
      <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
      {[
        { icon: Bold, action: () => {} },
        { icon: Italic, action: () => {} },
        { icon: List, action: () => {} },
        { icon: ListOrdered, action: () => {} },
        { icon: Minus, action: () => {} },
      ].map(({ icon: Icon, action }, i) => (
        <button
          key={i}
          onClick={action}
          className="rounded p-1 text-[var(--color-text-secondary)] hover:text-white transition"
        >
          <Icon size={12} />
        </button>
      ))}
      <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
      <button onClick={handleCopy} className="rounded p-1 text-[var(--color-text-secondary)] hover:text-white transition">
        <Copy size={12} />
      </button>
      <button className="rounded p-1 text-[var(--color-text-secondary)] hover:text-white transition">
        <Maximize2 size={12} />
      </button>
    </div>
  ) : null;

  const promptBar = (
    <NodePromptBar
      placeholder="我想生成"
      models={models}
      selectedModel={selectedModel || models[0]?.id || ''}
      onModelChange={setSelectedModel}
      onSubmit={handleGenerate}
      isGenerating={isGenerating}
      credits={1}
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
      title={nodeData.label || 'Text'}
      icon={<Type size={14} />}
      color="#6366f1"
      isEditing={isEditing}
      promptBar={promptBar}
      hoverActions={pipelineHoverAction}
      onRename={handleRename}
    >
      {isGenerating && (
        <div className="mb-2 flex items-center gap-2 text-xs text-[var(--color-primary)]">
          <Loader2 size={12} className="animate-spin" />
          <span>Generating...</span>
        </div>
      )}

      {nodeData.generationError && (
        <div className="mb-2 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-400">
          {nodeData.generationError}
        </div>
      )}

      {formatToolbar}

      {isEditing ? (
        <textarea
          value={(nodeData.content as string) || ''}
          onChange={handleChange}
          autoFocus
          className="nodrag nowheel min-h-[80px] w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-sm text-white outline-none focus:border-[var(--color-primary)]"
          placeholder="Type your text here..."
        />
      ) : (
        <div className="min-h-[60px] whitespace-pre-wrap rounded-lg p-2 text-sm text-[var(--color-text)]">
          {nodeData.content || (
            <span className="text-[var(--color-text-secondary)]">Click to edit...</span>
          )}
        </div>
      )}
    </NodeWrapper>
  );
});

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useEdges } from '@xyflow/react';
import {
  Type,
  Bold,
  Italic,
  List,
  ListOrdered,
  Minus,
  Copy,
  Loader2,
  Zap,
} from 'lucide-react';
import { GenerationType, getModelsForType, NodeType } from '@easytvc/shared';
import { NodeWrapper } from './NodeWrapper';
import { NodePromptBar } from './NodePromptBar';
import { ReferenceSelector, type NodeReference } from './ReferenceSelector';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';
import { useGenerationStore } from '../../stores/generationStore';

function execFmt(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

export const TextNodeComponent = memo(function TextNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setPipelineNode = useCanvasStore((s) => s.setPipelineNode);
  const nodes = useCanvasStore((s) => s.nodes);
  const { generateForNode } = useGenerationStore();
  const [selectedModel, setSelectedModel] = useState((nodeData.lastModel as string) || '');
  const [references, setReferences] = useState<NodeReference[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const edges = useEdges();

  const isEditing = editingNodeId === id;
  const isGenerating = nodeData.generationStatus === 'generating';
  const models = useMemo(() => getModelsForType(GenerationType.TEXT_TO_TEXT), []);

  const hasInputs = useMemo(
    () => edges.some((e) => e.target === id),
    [edges, id],
  );

  useEffect(() => {
    if (isEditing && editorRef.current) {
      const stored = (nodeData.content as string) || '';
      if (editorRef.current.innerHTML !== stored) {
        editorRef.current.innerHTML = stored;
      }
      editorRef.current.focus();
    }
  }, [isEditing]);

  const flushContent = useCallback(() => {
    if (editorRef.current) {
      updateNodeData(id, { content: editorRef.current.innerHTML });
    }
  }, [id, updateNodeData]);

  const handleCopy = useCallback(() => {
    const text = editorRef.current?.innerText || (nodeData.content as string) || '';
    navigator.clipboard.writeText(text);
  }, [nodeData.content]);

  const handleGenerate = useCallback(
    (prompt: string) => {
      const refTexts: string[] = [];
      for (const ref of references) {
        const n = nodes.find((nd) => nd.id === ref.nodeId);
        if (n && (n.data as EasyTVCNodeData).content) {
          refTexts.push(`[${ref.label}]: ${(n.data as EasyTVCNodeData).content}`);
        }
      }

      const fullPrompt = refTexts.length > 0
        ? `参考资料:\n${refTexts.join('\n')}\n\n用户需求:\n${prompt}`
        : prompt;

      generateForNode(id, GenerationType.TEXT_TO_TEXT, fullPrompt, {
        model: selectedModel || undefined,
      });
    },
    [id, selectedModel, references, nodes, generateForNode],
  );

  const handleOpenPipeline = useCallback(() => {
    setPipelineNode(id);
  }, [id, setPipelineNode]);

  const handleAddRef = useCallback((ref: NodeReference) => {
    setReferences((prev) => [...prev, ref]);
  }, []);

  const handleRemoveRef = useCallback((nodeId: string) => {
    setReferences((prev) => prev.filter((r) => r.nodeId !== nodeId));
  }, []);

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
    <div className="nodrag nopan nowheel mb-2 flex flex-wrap items-center gap-0.5 rounded-lg bg-[var(--color-bg)] p-1">
      {([
        { label: 'H1', cmd: () => execFmt('formatBlock', 'h1') },
        { label: 'H2', cmd: () => execFmt('formatBlock', 'h2') },
        { label: 'H3', cmd: () => execFmt('formatBlock', 'h3') },
        { label: 'P', cmd: () => execFmt('formatBlock', 'p') },
      ] as const).map((btn) => (
        <button
          key={btn.label}
          onMouseDown={(e) => { e.preventDefault(); btn.cmd(); }}
          className="rounded px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-white transition"
        >
          {btn.label}
        </button>
      ))}
      <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
      {([
        { icon: Bold, cmd: () => execFmt('bold') },
        { icon: Italic, cmd: () => execFmt('italic') },
        { icon: List, cmd: () => execFmt('insertUnorderedList') },
        { icon: ListOrdered, cmd: () => execFmt('insertOrderedList') },
        { icon: Minus, cmd: () => execFmt('insertHorizontalRule') },
      ] as const).map(({ icon: Icon, cmd }, i) => (
        <button
          key={i}
          onMouseDown={(e) => { e.preventDefault(); cmd(); }}
          className="rounded p-1 text-[var(--color-text-secondary)] hover:text-white transition"
        >
          <Icon size={12} />
        </button>
      ))}
      <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
      <button
        onMouseDown={(e) => { e.preventDefault(); handleCopy(); }}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:text-white transition"
        title="复制文本"
      >
        <Copy size={12} />
      </button>
    </div>
  ) : null;

  const leftSlot = hasInputs ? (
    <ReferenceSelector
      currentNodeId={id}
      references={references}
      onAdd={handleAddRef}
      onRemove={handleRemoveRef}
    />
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
      leftSlot={leftSlot}
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
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={flushContent}
          onBlur={flushContent}
          className="richtext-editor nodrag nopan nowheel min-h-[80px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-sm text-white outline-none focus:border-[var(--color-primary)] [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-[var(--color-text-secondary)]"
          data-placeholder="Type your text here..."
        />
      ) : (
        <div
          className="richtext-editor min-h-[60px] whitespace-pre-wrap rounded-lg p-2 text-sm text-[var(--color-text)]"
          dangerouslySetInnerHTML={{
            __html: (nodeData.content as string) || '<span style="color:var(--color-text-secondary)">Click to edit...</span>',
          }}
        />
      )}
    </NodeWrapper>
  );
});

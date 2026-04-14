import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { type NodeProps } from '@xyflow/react';
import { PaintBucket, Eraser, Undo2, Loader2, Trash2, Palette } from 'lucide-react';
import { GenerationType, getModelsForType, NodeType } from '@easytvc/shared';
import { NodeWrapper } from './NodeWrapper';
import { NodePromptBar } from './NodePromptBar';
import { ReferenceSelector, type NodeReference } from './ReferenceSelector';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';
import { useGenerationStore } from '../../stores/generationStore';

const CANVAS_W = 360;
const CANVAS_H = 240;

const BRUSH_COLORS = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0088ff', '#ffaa00', '#ff00ff'];
const BRUSH_SIZES = [2, 5, 10, 20];

export const ImageEditorNodeComponent = memo(function ImageEditorNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const { generateForNode } = useGenerationStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIdxRef = useRef(-1);

  const [selectedModel, setSelectedModel] = useState((nodeData.lastModel as string) || '');
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [references, setReferences] = useState<NodeReference[]>([]);

  const isEditing = editingNodeId === id;
  const isGenerating = nodeData.generationStatus === 'generating';
  const models = useMemo(() => getModelsForType(GenerationType.TEXT_TO_IMAGE), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (nodeData.drawingData) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.drawImage(img, 0, 0);
        pushCanvasHistory();
      };
      img.src = nodeData.drawingData as string;
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      pushCanvasHistory();
    }
  }, []);

  function pushCanvasHistory() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(imageData);
    if (historyRef.current.length > 30) historyRef.current.shift();
    historyIdxRef.current = historyRef.current.length - 1;
  }

  function handleUndo() {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    saveDrawingData();
  }

  function handleClear() {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    pushCanvasHistory();
    saveDrawingData();
  }

  function saveDrawingData() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    updateNodeData(id, { drawingData: canvas.toDataURL('image/png') });
  }

  function getCanvasPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (!isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getCanvasPos(e);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current || !lastPos.current) return;
    e.stopPropagation();
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = isEraser ? '#1a1a2e' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    if (isDrawing.current) {
      isDrawing.current = false;
      lastPos.current = null;
      pushCanvasHistory();
      saveDrawingData();
    }
  }

  const handleGenerate = useCallback(
    (prompt: string) => {
      const canvas = canvasRef.current;
      const drawingUrl = canvas?.toDataURL('image/png');

      const imageUrls: string[] = [];
      if (drawingUrl) imageUrls.push(drawingUrl);

      for (const ref of references) {
        if (ref.nodeType === NodeType.IMAGE && ref.src) {
          imageUrls.push(ref.src);
        }
      }

      generateForNode(id, GenerationType.TEXT_TO_IMAGE, prompt, {
        model: selectedModel || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
    },
    [id, selectedModel, references, generateForNode],
  );

  const handleAddRef = useCallback((ref: NodeReference) => {
    setReferences((prev) => [...prev, ref]);
  }, []);

  const handleRemoveRef = useCallback((nodeId: string) => {
    setReferences((prev) => prev.filter((r) => r.nodeId !== nodeId));
  }, []);

  const handleRename = useCallback(
    (newTitle: string) => updateNodeData(id, { label: newTitle }),
    [id, updateNodeData],
  );

  const leftSlot = (
    <ReferenceSelector
      currentNodeId={id}
      references={references}
      onAdd={handleAddRef}
      onRemove={handleRemoveRef}
      allowedTypes={[NodeType.IMAGE, NodeType.TEXT]}
    />
  );

  const promptBar = (
    <NodePromptBar
      placeholder="描述你想要生成的图片（涂鸦作为参考）"
      models={models}
      selectedModel={selectedModel || models[0]?.id || ''}
      onModelChange={setSelectedModel}
      onSubmit={handleGenerate}
      isGenerating={isGenerating}
      leftSlot={leftSlot}
      credits={5}
      initialPrompt={(nodeData.lastPrompt as string) || ''}
    />
  );

  const drawToolbar = isEditing ? (
    <div className="nodrag mb-2 flex items-center gap-1 rounded-lg bg-[var(--color-bg)] p-1.5">
      <div className="flex items-center gap-0.5">
        {BRUSH_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { setBrushColor(c); setIsEraser(false); }}
            className={`h-5 w-5 rounded-full border-2 transition ${
              !isEraser && brushColor === c ? 'border-white scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
      <div className="flex items-center gap-0.5">
        {BRUSH_SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setBrushSize(s)}
            className={`flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] transition ${
              brushSize === s ? 'bg-[var(--color-primary)]/20 text-white' : 'text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            {s}px
          </button>
        ))}
      </div>
      <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
      <button
        onClick={() => setIsEraser(!isEraser)}
        className={`rounded p-1 transition ${isEraser ? 'text-white bg-[var(--color-surface-hover)]' : 'text-[var(--color-text-secondary)] hover:text-white'}`}
        title="Eraser"
      >
        <Eraser size={12} />
      </button>
      <button
        onClick={handleUndo}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:text-white transition"
        title="Undo"
      >
        <Undo2 size={12} />
      </button>
      <button
        onClick={handleClear}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:text-white transition"
        title="Clear"
      >
        <Trash2 size={12} />
      </button>
    </div>
  ) : null;

  return (
    <NodeWrapper
      nodeId={id}
      title={nodeData.label || 'Image Editor'}
      icon={<Palette size={14} />}
      color="#ec4899"
      isEditing={isEditing}
      promptBar={promptBar}
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

      {nodeData.src && (
        <div className="mb-2">
          <img
            src={nodeData.src as string}
            alt="Generated"
            className="w-full rounded-lg object-contain"
          />
        </div>
      )}

      {drawToolbar}

      <div
        className="nodrag nowheel nopan"
        onPointerDown={(e) => isEditing && e.stopPropagation()}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          onPointerDown={(e) => isEditing && e.stopPropagation()}
          className={`w-full rounded-lg border touch-none ${
            isEditing
              ? 'border-[var(--color-primary)] cursor-crosshair'
              : 'border-[var(--color-border)] pointer-events-none'
          }`}
          style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
        />
      </div>

      {!isEditing && !nodeData.src && !nodeData.drawingData && (
        <div className="mt-1 text-center text-[10px] text-[var(--color-text-secondary)]">
          Double-click to draw
        </div>
      )}
    </NodeWrapper>
  );
});

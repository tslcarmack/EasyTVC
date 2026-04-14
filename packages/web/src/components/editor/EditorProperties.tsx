import { useState, useCallback, useMemo } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { GenerationType, getModelsForType } from '@easytvc/shared';
import { useImageEditorStore } from '../../stores/imageEditorStore';
import { getTool, type EditorToolPlugin } from './tools/registry';
import { HistoryPanel } from './HistoryPanel';
import { getAccessToken } from '../../api/client';

function loadImageAsCanvas(src: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = () => {
      const img2 = new Image();
      img2.onload = () => {
        const c = document.createElement('canvas');
        c.width = img2.width;
        c.height = img2.height;
        c.getContext('2d')!.drawImage(img2, 0, 0);
        resolve(c);
      };
      img2.onerror = reject;
      img2.src = src;
    };
    img.src = src;
  });
}

function makeThumbnail(canvas: HTMLCanvasElement): string {
  const c = document.createElement('canvas');
  c.width = 60;
  c.height = 60;
  const ctx = c.getContext('2d')!;
  const scale = Math.min(60 / canvas.width, 60 / canvas.height);
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  ctx.drawImage(canvas, (60 - w) / 2, (60 - h) / 2, w, h);
  return c.toDataURL('image/jpeg', 0.6);
}

export function EditorProperties() {
  const store = useImageEditorStore;
  const {
    activeTool,
    toolParams,
    setToolParam,
    setToolParams,
    isGenerating,
    generationError,
    setGenerating,
    setGenerationError,
    pushHistory,
    canvasWidth,
    canvasHeight,
  } = store();

  const [aiPrompt, setAiPrompt] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');

  const tool: EditorToolPlugin | undefined = activeTool ? getTool(activeTool) : undefined;
  const isAiTool = tool?.category === 'ai';

  const imageModels = useMemo(
    () => getModelsForType(GenerationType.TEXT_TO_IMAGE),
    [],
  );

  const handleApplyCanvas = useCallback(async () => {
    if (!tool?.applyCanvas) return;
    setIsApplying(true);

    try {
      const currentUrl = store.getState().getCurrentImageDataUrl();
      if (!currentUrl) return;

      const srcCanvas = await loadImageAsCanvas(currentUrl);
      const imageData = srcCanvas
        .getContext('2d')!
        .getImageData(0, 0, srcCanvas.width, srcCanvas.height);
      const tp = store.getState().toolParams;

      const result = await tool.applyCanvas!(imageData, tp);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = result.width;
      outCanvas.height = result.height;
      outCanvas.getContext('2d')!.putImageData(result, 0, 0);

      const dataUrl = outCanvas.toDataURL('image/png');

      pushHistory({
        action: tool.name,
        imageDataUrl: dataUrl,
        thumbnail: makeThumbnail(outCanvas),
        toolId: tool.id,
      });

      if (tool.category === 'annotate') {
        setToolParams({ ...tool.defaultParams });
      }
    } catch (err) {
      console.error('Apply failed:', err);
    } finally {
      setIsApplying(false);
    }
  }, [tool, pushHistory, setToolParams]);

  const handleAIGenerate = useCallback(async () => {
    if (!tool?.buildAIRequest) return;

    const currentUrl = store.getState().getCurrentImageDataUrl();
    if (!currentUrl) return;

    let imageDataUrl = currentUrl;
    if (!currentUrl.startsWith('data:')) {
      try {
        const c = await loadImageAsCanvas(currentUrl);
        imageDataUrl = c.toDataURL('image/png');
      } catch {
        /* fallback */
      }
    }

    const { maskData } = store.getState();
    const tp = store.getState().toolParams;

    const request = tool.buildAIRequest({
      currentImageDataUrl: imageDataUrl,
      maskDataUrl: maskData ?? undefined,
      params: { ...tp, prompt: aiPrompt },
      canvasWidth,
      canvasHeight,
    });

    const modelToUse = selectedModel || request.model || imageModels[0]?.id || '';

    setGenerating(true);
    setGenerationError(null);

    try {
      const res = await fetch('/api/generate/pipeline/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          prompt: request.prompt,
          referenceImageUrls: request.referenceImageUrls,
          model: modelToUse,
          width: request.width ?? canvasWidth,
          height: request.height ?? canvasHeight,
        }),
      });

      const json = await res.json();

      if (json.success && json.data?.resultUrl) {
        const resultUrl: string = json.data.resultUrl;

        let dataUrl: string;
        if (resultUrl.startsWith('data:')) {
          dataUrl = resultUrl;
        } else {
          const c = await loadImageAsCanvas(resultUrl);
          dataUrl = c.toDataURL('image/png');
        }

        const tmpImg = new Image();
        tmpImg.onload = () => {
          const tc = document.createElement('canvas');
          tc.width = tmpImg.width;
          tc.height = tmpImg.height;
          tc.getContext('2d')!.drawImage(tmpImg, 0, 0);

          pushHistory({
            action: `AI ${tool.name}`,
            imageDataUrl: dataUrl,
            thumbnail: makeThumbnail(tc),
            toolId: tool.id,
          });
          setGenerating(false);
        };
        tmpImg.onerror = () => {
          pushHistory({
            action: `AI ${tool.name}`,
            imageDataUrl: dataUrl,
            thumbnail: dataUrl,
            toolId: tool.id,
          });
          setGenerating(false);
        };
        tmpImg.src = dataUrl;
      } else {
        setGenerationError(json.message || 'AI generation failed');
        setGenerating(false);
      }
    } catch (err: any) {
      setGenerationError(err?.message || 'Network error');
      setGenerating(false);
    }
  }, [
    tool,
    aiPrompt,
    selectedModel,
    imageModels,
    canvasWidth,
    canvasHeight,
    pushHistory,
    setGenerating,
    setGenerationError,
  ]);

  const hasAnnotations =
    tool?.category === 'annotate' &&
    ((toolParams._strokes?.length > 0) ||
      (toolParams._shapes?.length > 0) ||
      (toolParams._arrows?.length > 0) ||
      (toolParams._texts?.length > 0) ||
      (toolParams._regions?.length > 0));

  return (
    <div className="flex w-64 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3">
        {tool ? (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white">
              <tool.icon size={14} />
              {tool.name}
            </div>

            {tool.renderParams(toolParams, setToolParam)}

            {/* Apply button for Canvas tools */}
            {!isAiTool && tool.applyCanvas && (
              <button
                onClick={handleApplyCanvas}
                disabled={isApplying}
                className="mt-3 w-full rounded-lg bg-[var(--color-primary)] py-2 text-xs font-medium text-white transition hover:bg-[var(--color-primary)]/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? '处理中...' : '应用'}
              </button>
            )}

            {/* Annotation hint */}
            {tool.category === 'annotate' && (
              <div className="mt-2 rounded-md bg-white/5 px-2 py-1.5 text-[10px] text-[var(--color-text-secondary)]">
                {activeTool === 'text'
                  ? '输入文字后点击画布放置，再点击"应用"烘焙到图片'
                  : '在画布上绘制，完成后点击"应用"烘焙到图片'}
                {hasAnnotations && (
                  <span className="block mt-1 text-[var(--color-primary)]">
                    已有{' '}
                    {(toolParams._strokes?.length || 0) +
                      (toolParams._shapes?.length || 0) +
                      (toolParams._arrows?.length || 0) +
                      (toolParams._texts?.length || 0) +
                      (toolParams._regions?.length || 0)}{' '}
                    个标注待应用
                  </span>
                )}
              </div>
            )}

            {/* AI tools: model selector + prompt + generate */}
            {isAiTool && (
              <div className="mt-3 space-y-2">
                {tool.needsMask && (
                  <div className="rounded-md bg-purple-500/10 px-2 py-1.5 text-[10px] text-purple-300">
                    在画布上涂抹选择区域（红色标记），然后输入描述并生成
                  </div>
                )}

                {/* Model selector */}
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--color-text-secondary)]">
                    AI 模型
                  </label>
                  <select
                    value={selectedModel || imageModels[0]?.id || ''}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[11px] text-white focus:border-[var(--color-primary)] focus:outline-none appearance-none"
                  >
                    {imageModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="描述你想要的效果..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-xs text-white placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none resize-none"
                  rows={3}
                />
                <button
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      AI 生成
                    </>
                  )}
                </button>
                {generationError && (
                  <div className="rounded-md bg-red-500/10 px-2 py-1 text-[10px] text-red-400">
                    {generationError}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-xs text-[var(--color-text-secondary)]">
              选择左侧工具开始编辑
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)]">
        <HistoryPanel />
      </div>
    </div>
  );
}

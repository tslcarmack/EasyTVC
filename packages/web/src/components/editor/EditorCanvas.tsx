import { useRef, useEffect, useCallback } from 'react';
import { useImageEditorStore } from '../../stores/imageEditorStore';
import { getTool } from './tools/registry';

function canvasCoords(
  e: React.MouseEvent | MouseEvent,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e as MouseEvent).clientX - rect.left) * (canvas.width / rect.width),
    y: ((e as MouseEvent).clientY - rect.top) * (canvas.height / rect.height),
  };
}

function makeThumbnail(source: HTMLCanvasElement | HTMLImageElement, w: number, h: number): string {
  const c = document.createElement('canvas');
  c.width = 60;
  c.height = 60;
  const ctx = c.getContext('2d')!;
  const scale = Math.min(60 / w, 60 / h);
  const dw = w * scale;
  const dh = h * scale;
  ctx.drawImage(source, (60 - dw) / 2, (60 - dh) / 2, dw, dh);
  return c.toDataURL('image/jpeg', 0.6);
}

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const store = useImageEditorStore;
  const {
    sourceImageUrl,
    zoom,
    panOffset,
    setZoom,
    setPan,
    setCanvasSize,
    pushHistory,
    history,
    historyIndex,
    activeTool,
    toolParams,
    setToolParam,
    setMaskData,
  } = store();

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const isDrawingRef = useRef(false);
  const drawStartRef = useRef({ x: 0, y: 0 });
  const currentPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const initDoneRef = useRef(false);

  const tool = activeTool ? getTool(activeTool) : undefined;
  const isAnnotate = tool?.category === 'annotate';
  const needsMask = !!tool?.needsMask;

  const currentDataUrl =
    historyIndex >= 0 && history[historyIndex]
      ? history[historyIndex].imageDataUrl
      : sourceImageUrl;

  // ── Load image and initialize ──
  useEffect(() => {
    if (!currentDataUrl) return;
    const base = baseCanvasRef.current;
    if (!base) return;
    const ctx = base.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const onLoad = (image: HTMLImageElement) => {
      base.width = image.width;
      base.height = image.height;
      ctx.clearRect(0, 0, base.width, base.height);
      ctx.drawImage(image, 0, 0);
      setCanvasSize(image.width, image.height);

      const overlay = overlayCanvasRef.current;
      if (overlay) {
        overlay.width = image.width;
        overlay.height = image.height;
      }

      if (!initDoneRef.current && store.getState().history.length === 0) {
        let dataUrl: string;
        try {
          dataUrl = base.toDataURL('image/png');
        } catch {
          dataUrl = currentDataUrl!;
        }
        pushHistory({
          action: '原图',
          imageDataUrl: dataUrl,
          thumbnail: makeThumbnail(base, image.width, image.height),
          toolId: 'original',
        });
        initDoneRef.current = true;
      }
    };

    img.onload = () => onLoad(img);
    img.onerror = () => {
      const img2 = new Image();
      img2.onload = () => onLoad(img2);
      img2.src = currentDataUrl!;
    };
    img.src = currentDataUrl;
  }, [currentDataUrl]);

  // Reset init flag on new open
  useEffect(() => {
    initDoneRef.current = false;
  }, [sourceImageUrl]);

  // ── Clear overlay on history or tool changes ──
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
    }
  }, [historyIndex, activeTool]);

  // ── Redraw committed annotations on overlay ──
  const redrawOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    const s = store.getState();
    const tp = s.toolParams;
    const at = s.activeTool;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Brush strokes
    if (at === 'brush' && tp._strokes) {
      for (const stroke of tp._strokes) {
        if (stroke.points.length < 2) continue;
        ctx.save();
        ctx.globalAlpha = (stroke.opacity ?? 100) / 100;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // Rect/Ellipse
    if (at === 'rect-ellipse' && tp._shapes) {
      for (const sh of tp._shapes) {
        ctx.strokeStyle = sh.color;
        ctx.fillStyle = sh.color;
        ctx.lineWidth = sh.lineWidth;
        if (sh.shape === 'rect') {
          if (sh.filled) ctx.fillRect(sh.x, sh.y, sh.w, sh.h);
          else ctx.strokeRect(sh.x, sh.y, sh.w, sh.h);
        } else {
          ctx.beginPath();
          ctx.ellipse(sh.x + sh.w / 2, sh.y + sh.h / 2, Math.abs(sh.w / 2), Math.abs(sh.h / 2), 0, 0, Math.PI * 2);
          if (sh.filled) ctx.fill();
          else ctx.stroke();
        }
      }
    }

    // Arrows
    if (at === 'arrow' && tp._arrows) {
      for (const a of tp._arrows) {
        drawArrow(ctx, a.x1, a.y1, a.x2, a.y2, a.color, a.lineWidth);
      }
    }

    // Text annotations
    if (at === 'text' && tp._texts) {
      for (const t of tp._texts) {
        ctx.font = `${t.fontWeight} ${t.fontSize}px sans-serif`;
        ctx.fillStyle = t.color;
        ctx.textBaseline = 'top';
        ctx.fillText(t.text, t.x, t.y);
      }
    }

    // Mosaic/blur regions indicator
    if (at === 'mosaic-blur' && tp._regions) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#888888';
      for (const region of tp._regions) {
        if (region.points.length < 2) continue;
        ctx.lineWidth = region.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(region.points[0].x, region.points[0].y);
        for (let i = 1; i < region.points.length; i++) {
          ctx.lineTo(region.points[i].x, region.points[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Crop overlay
    if (at === 'crop' && tp.w > 0 && tp.h > 0) {
      const { x, y, w, h } = tp;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, overlay.width, y);
      ctx.fillRect(0, y + h, overlay.width, overlay.height - y - h);
      ctx.fillRect(0, y, x, h);
      ctx.fillRect(x + w, y, overlay.width - x - w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + (w * i) / 3, y);
        ctx.lineTo(x + (w * i) / 3, y + h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + (h * i) / 3);
        ctx.lineTo(x + w, y + (h * i) / 3);
        ctx.stroke();
      }
    }
  }, []);

  // Redraw overlay whenever tool params or active tool changes
  useEffect(() => {
    redrawOverlay();
  }, [toolParams, activeTool]);

  // ── Mouse handlers ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y };
        e.preventDefault();
        return;
      }
      if (e.button !== 0) return;

      const overlay = overlayCanvasRef.current;
      if (!overlay || !activeTool) return;

      const pos = canvasCoords(e, overlay);
      isDrawingRef.current = true;
      drawStartRef.current = pos;
      currentPointsRef.current = [pos];

      if (activeTool === 'text') {
        const tp = store.getState().toolParams;
        if (tp.text) {
          const texts = tp._texts || [];
          setToolParam('_texts', [
            ...texts,
            { x: pos.x, y: pos.y, text: tp.text, fontSize: tp.fontSize || 24, color: tp.color || '#ffffff', fontWeight: tp.fontWeight || 'normal' },
          ]);
        }
        isDrawingRef.current = false;
      }
    },
    [activeTool, panOffset, setToolParam],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({ x: panStartRef.current.ox + dx, y: panStartRef.current.oy + dy });
        return;
      }
      if (!isDrawingRef.current) return;

      const overlay = overlayCanvasRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;
      const pos = canvasCoords(e, overlay);

      const at = store.getState().activeTool;
      const tp = store.getState().toolParams;

      if (at === 'brush') {
        const last = currentPointsRef.current[currentPointsRef.current.length - 1];
        ctx.save();
        ctx.globalAlpha = (tp.opacity ?? 100) / 100;
        ctx.strokeStyle = tp.color || '#ff0000';
        ctx.lineWidth = tp.size || 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.restore();
        currentPointsRef.current.push(pos);
      }

      if (at === 'mosaic-blur') {
        const last = currentPointsRef.current[currentPointsRef.current.length - 1];
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = tp.size || 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.restore();
        currentPointsRef.current.push(pos);
      }

      if (at === 'rect-ellipse') {
        redrawOverlay();
        const start = drawStartRef.current;
        const w = pos.x - start.x;
        const h = pos.y - start.y;
        ctx.strokeStyle = tp.color || '#ff0000';
        ctx.fillStyle = tp.color || '#ff0000';
        ctx.lineWidth = tp.lineWidth || 2;
        if (tp.shape === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(start.x + w / 2, start.y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
          if (tp.filled) ctx.fill(); else ctx.stroke();
        } else {
          if (tp.filled) ctx.fillRect(start.x, start.y, w, h);
          else ctx.strokeRect(start.x, start.y, w, h);
        }
      }

      if (at === 'arrow') {
        redrawOverlay();
        const start = drawStartRef.current;
        drawArrow(ctx, start.x, start.y, pos.x, pos.y, tp.color || '#ff0000', tp.lineWidth || 3);
      }

      if (at === 'crop') {
        const start = drawStartRef.current;
        const x = Math.max(0, Math.min(start.x, pos.x));
        const y = Math.max(0, Math.min(start.y, pos.y));
        const w = Math.min(Math.abs(pos.x - start.x), overlay.width - x);
        const h = Math.min(Math.abs(pos.y - start.y), overlay.height - y);
        store.getState().setToolParam('x', Math.round(x));
        store.getState().setToolParam('y', Math.round(y));
        store.getState().setToolParam('w', Math.round(w));
        store.getState().setToolParam('h', Math.round(h));
      }

      // Mask painting for AI tools that need mask
      if (needsMask && (at?.startsWith('ai-'))) {
        const last = currentPointsRef.current[currentPointsRef.current.length - 1];
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 30;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.restore();
        currentPointsRef.current.push(pos);
      }
    },
    [setPan, redrawOverlay, needsMask],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      isPanningRef.current = false;
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      const overlay = overlayCanvasRef.current;
      if (!overlay) return;
      const pos = canvasCoords(e, overlay);

      const at = store.getState().activeTool;
      const tp = store.getState().toolParams;

      if (at === 'brush') {
        const strokes = tp._strokes || [];
        store.getState().setToolParam('_strokes', [
          ...strokes,
          { points: [...currentPointsRef.current], color: tp.color || '#ff0000', size: tp.size || 5, opacity: tp.opacity ?? 100 },
        ]);
      }

      if (at === 'rect-ellipse') {
        const shapes = tp._shapes || [];
        const start = drawStartRef.current;
        store.getState().setToolParam('_shapes', [
          ...shapes,
          {
            shape: tp.shape || 'rect',
            x: Math.min(start.x, pos.x), y: Math.min(start.y, pos.y),
            w: Math.abs(pos.x - start.x), h: Math.abs(pos.y - start.y),
            color: tp.color || '#ff0000', lineWidth: tp.lineWidth || 2, filled: tp.filled ?? false,
          },
        ]);
      }

      if (at === 'arrow') {
        const arrows = tp._arrows || [];
        const start = drawStartRef.current;
        store.getState().setToolParam('_arrows', [
          ...arrows,
          { x1: start.x, y1: start.y, x2: pos.x, y2: pos.y, color: tp.color || '#ff0000', lineWidth: tp.lineWidth || 3 },
        ]);
      }

      if (at === 'mosaic-blur') {
        const regions = tp._regions || [];
        store.getState().setToolParam('_regions', [
          ...regions,
          { points: [...currentPointsRef.current], type: tp.type || 'mosaic', size: tp.size || 20, blockSize: tp.blockSize || 10 },
        ]);
      }

      // Export mask data for AI tools
      if (needsMask && at?.startsWith('ai-')) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = overlay.width;
        maskCanvas.height = overlay.height;
        const maskCtx = maskCanvas.getContext('2d')!;
        const overlayCtx = overlay.getContext('2d')!;
        const overlayData = overlayCtx.getImageData(0, 0, overlay.width, overlay.height);
        const maskImageData = maskCtx.createImageData(overlay.width, overlay.height);
        for (let i = 0; i < overlayData.data.length; i += 4) {
          const hasColor = overlayData.data[i] > 30 && overlayData.data[i + 3] > 30;
          const val = hasColor ? 255 : 0;
          maskImageData.data[i] = val;
          maskImageData.data[i + 1] = val;
          maskImageData.data[i + 2] = val;
          maskImageData.data[i + 3] = 255;
        }
        maskCtx.putImageData(maskImageData, 0, 0);
        setMaskData(maskCanvas.toDataURL('image/png'));
      }

      currentPointsRef.current = [];
    },
    [setMaskData, needsMask],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setZoom(zoom + (e.deltaY > 0 ? -0.1 : 0.1));
    },
    [zoom, setZoom],
  );

  const cursor = !activeTool
    ? 'grab'
    : activeTool === 'crop' || isAnnotate || needsMask
      ? 'crosshair'
      : activeTool === 'text'
        ? 'text'
        : 'default';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-[#1a1a22]"
      onWheel={handleWheel}
      style={{ cursor }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <div
            className="relative"
            style={{
              backgroundImage:
                'repeating-conic-gradient(#2a2a32 0% 25%, #1e1e26 0% 50%) 0 0 / 16px 16px',
            }}
          >
            <canvas
              ref={baseCanvasRef}
              className="block max-w-none"
              style={{ imageRendering: zoom > 2 ? 'pixelated' : 'auto' }}
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 block max-w-none"
              style={{ imageRendering: zoom > 2 ? 'pixelated' : 'auto' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={(e) => {
                if (isDrawingRef.current) handleMouseUp(e);
                isPanningRef.current = false;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, lineWidth: number,
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = lineWidth * 4;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

import { useState, useCallback, useMemo, useRef, useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import {
  Film,
  Play,
  Pause,
  Download,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Plus,
  Image,
  X,
  Loader2,
} from 'lucide-react';
import { NodeType } from '@easytvc/shared';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';

interface TimelineClip {
  nodeId: string;
  label: string;
  src: string;
  duration: number;
  thumbnail?: string;
  type: 'video' | 'image';
}

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const EXPORT_FPS = 30;

export function TimelinePanel() {
  const [expanded, setExpanded] = useState(false);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [playing, setPlaying] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const playingRef = useRef(false);
  const currentClipRef = useRef(0);
  const animFrameRef = useRef(0);

  const nodes = useCanvasStore((s) => s.nodes);

  const mediaNodes = useMemo(
    () =>
      nodes.filter(
        (n) =>
          (n.data.nodeType === NodeType.VIDEO || n.data.nodeType === NodeType.IMAGE) &&
          (n.data as EasyTVCNodeData).src,
      ),
    [nodes],
  );

  const handleAddClip = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const d = node.data as EasyTVCNodeData;
      if (clips.some((c) => c.nodeId === nodeId)) return;

      setClips((prev) => [
        ...prev,
        {
          nodeId,
          label: d.label || (d.nodeType === NodeType.VIDEO ? 'Video' : 'Image'),
          src: d.src as string,
          duration: (d.duration as number) || (d.nodeType === NodeType.IMAGE ? 3 : 5),
          type: d.nodeType === NodeType.VIDEO ? 'video' : 'image',
        },
      ]);
    },
    [nodes, clips],
  );

  const handleRemoveClip = useCallback((index: number) => {
    setClips((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMoveClip = useCallback((from: number, to: number) => {
    setClips((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const totalDuration = useMemo(
    () => clips.reduce((sum, c) => sum + c.duration, 0),
    [clips],
  );

  // ── Smooth sequential playback with preloading ──

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    setCurrentClipIndex(0);
    currentClipRef.current = 0;
    cancelAnimationFrame(animFrameRef.current);
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
      previewVideoRef.current.src = '';
    }
  }, []);

  const playNextClip = useCallback((clipsSnapshot: TimelineClip[]) => {
    const idx = currentClipRef.current;
    if (idx >= clipsSnapshot.length || !playingRef.current) {
      playingRef.current = false;
      setPlaying(false);
      setCurrentClipIndex(0);
      currentClipRef.current = 0;
      return;
    }

    setCurrentClipIndex(idx);
    const clip = clipsSnapshot[idx];

    if (clip.type === 'video' && previewVideoRef.current) {
      const video = previewVideoRef.current;
      video.src = clip.src;
      video.currentTime = 0;

      const onCanPlay = () => {
        video.removeEventListener('canplay', onCanPlay);
        if (!playingRef.current) return;
        video.play().catch(() => {});
      };

      const onEnded = () => {
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('error', onError);
        currentClipRef.current += 1;
        playNextClip(clipsSnapshot);
      };

      const onError = () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('error', onError);
        currentClipRef.current += 1;
        playNextClip(clipsSnapshot);
      };

      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('ended', onEnded);
      video.addEventListener('error', onError);
    } else if (clip.type === 'image') {
      setTimeout(() => {
        if (!playingRef.current) return;
        currentClipRef.current += 1;
        playNextClip(clipsSnapshot);
      }, clip.duration * 1000);
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (clips.length === 0) return;
    playingRef.current = true;
    currentClipRef.current = 0;
    setPlaying(true);
    setCurrentClipIndex(0);
    playNextClip(clips);
  }, [clips, playNextClip]);

  const handlePause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (previewVideoRef.current) previewVideoRef.current.pause();
  }, []);

  useEffect(() => {
    return () => {
      playingRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!addMenuOpen) return;
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (
        addMenuRef.current && !addMenuRef.current.contains(e.target as Node) &&
        addBtnRef.current && !addBtnRef.current.contains(e.target as Node)
      ) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addMenuOpen]);

  // ── Export: merge all clips into one video via Canvas + MediaRecorder ──

  const handleExport = useCallback(async () => {
    if (clips.length === 0) return;
    setExporting(true);
    setExportProgress(0);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext('2d')!;

      const stream = canvas.captureStream(EXPORT_FPS);
      const recorder = new MediaRecorder(stream, {
        mimeType: getSupportedMimeType(),
        videoBitsPerSecond: 8_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const done = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start(100);

      for (let i = 0; i < clips.length; i++) {
        setExportProgress(Math.round((i / clips.length) * 100));
        const clip = clips[i];

        if (clip.type === 'video') {
          await renderVideoClipToCanvas(clip.src, ctx, canvas);
        } else {
          await renderImageClipToCanvas(clip.src, clip.duration, ctx, canvas);
        }
      }

      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
      await done;

      setExportProgress(100);
      const ext = getSupportedMimeType().includes('webm') ? 'webm' : 'mp4';
      const blob = new Blob(chunks, { type: getSupportedMimeType() });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `easytvc-export-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Timeline] Export failed:', err);
      alert('导出失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  }, [clips]);

  const currentClip = playing ? clips[currentClipIndex] : null;

  const availableNodes = mediaNodes.filter(
    (n) => !clips.some((c) => c.nodeId === n.id),
  );

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 ${
        expanded ? 'h-64' : 'h-10'
      }`}
    >
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex h-10 w-full items-center gap-2 px-4 text-xs font-medium text-[var(--color-text-secondary)] hover:text-white transition"
      >
        <Film size={14} />
        <span>时间线</span>
        <span className="ml-1 rounded bg-[var(--color-bg)] px-1.5 py-0.5 text-[10px]">
          {clips.length} clips · {totalDuration.toFixed(1)}s
        </span>
        <div className="flex-1" />
        {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {expanded && (
        <div className="relative flex h-[calc(100%-40px)] gap-3 px-4 pb-3">
          {/* Preview */}
          <div className="flex w-52 flex-shrink-0 flex-col gap-2">
            <div className="relative flex-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-black">
              {/* Hidden video element for playback */}
              <video
                ref={previewVideoRef}
                className={`h-full w-full object-contain ${
                  currentClip?.type === 'video' ? '' : 'hidden'
                }`}
              />

              {currentClip?.type === 'image' ? (
                <img
                  src={currentClip.src}
                  className="h-full w-full object-contain"
                  alt=""
                />
              ) : !playing && clips.length > 0 ? (
                clips[0].type === 'video' ? (
                  <video src={clips[0].src} className="h-full w-full object-contain" />
                ) : (
                  <img src={clips[0].src} className="h-full w-full object-contain" alt="" />
                )
              ) : !playing ? (
                <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-secondary)]">
                  No clips
                </div>
              ) : null}

              {playing && (
                <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                  {currentClipIndex + 1}/{clips.length}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {playing ? (
                <button
                  onClick={handlePause}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-primary)] py-1.5 text-xs font-medium text-white"
                >
                  <Pause size={12} /> 暂停
                </button>
              ) : (
                <button
                  onClick={handlePlay}
                  disabled={clips.length === 0}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-primary)] py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  <Play size={12} /> 预览
                </button>
              )}
              <button
                onClick={handleExport}
                disabled={clips.length === 0 || exporting}
                className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-white transition disabled:opacity-40"
              >
                {exporting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    {exportProgress}%
                  </>
                ) : (
                  <>
                    <Download size={12} />
                    合并导出
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Clips timeline */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full items-start gap-2 py-1">
              {clips.map((clip, i) => (
                <div
                  key={clip.nodeId}
                  className={`group relative flex-shrink-0 w-32 rounded-lg border overflow-hidden transition ${
                    playing && currentClipIndex === i
                      ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  <div className="relative h-20 bg-black">
                    {clip.type === 'video' ? (
                      <video src={clip.src} className="h-full w-full object-cover" preload="metadata" />
                    ) : (
                      <img src={clip.src} className="h-full w-full object-cover" alt="" />
                    )}
                    <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] text-white">
                      {clip.duration}s
                    </div>
                    {clip.type === 'image' && (
                      <div className="absolute top-1 left-1">
                        <Image size={10} className="text-white/60" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--color-surface)]">
                    <GripVertical size={10} className="text-[var(--color-text-secondary)] cursor-grab" />
                    <span className="flex-1 truncate text-[10px] text-white">{clip.label}</span>

                    <div className="hidden group-hover:flex items-center gap-0.5">
                      {i > 0 && (
                        <button
                          onClick={() => handleMoveClip(i, i - 1)}
                          className="text-[var(--color-text-secondary)] hover:text-white"
                        >
                          <ChevronUp size={10} className="rotate-[-90deg]" />
                        </button>
                      )}
                      {i < clips.length - 1 && (
                        <button
                          onClick={() => handleMoveClip(i, i + 1)}
                          className="text-[var(--color-text-secondary)] hover:text-white"
                        >
                          <ChevronDown size={10} className="rotate-[-90deg]" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveClip(i)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add clip button */}
              {availableNodes.length > 0 && (
                <div className="relative flex-shrink-0">
                  <button
                    ref={addBtnRef}
                    onClick={() => setAddMenuOpen((v) => !v)}
                    className="flex h-[104px] w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-white"
                  >
                    <Plus size={16} />
                    <span className="text-[10px]">添加片段</span>
                  </button>
                </div>
              )}

              {clips.length === 0 && availableNodes.length === 0 && (
                <div className="flex h-full flex-1 items-center justify-center text-xs text-[var(--color-text-secondary)]">
                  画布上没有视频或图片素材。先生成一些内容吧！
                </div>
              )}
            </div>
          </div>

          {/* Floating add-clip menu (outside overflow container) */}
          {addMenuOpen && availableNodes.length > 0 && addBtnRef.current && (
            <div
              ref={addMenuRef}
              className="absolute z-50 max-h-48 w-52 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
              style={{
                bottom: `${addBtnRef.current.offsetHeight + 8}px`,
                right: '16px',
              }}
            >
              <div className="px-3 py-2 text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]">
                可用素材 ({availableNodes.length})
              </div>
              {availableNodes.map((n) => {
                const d = n.data as EasyTVCNodeData;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      handleAddClip(n.id);
                      if (availableNodes.length <= 1) setAddMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--color-surface-hover)] transition"
                  >
                    {d.nodeType === NodeType.VIDEO ? (
                      <Film size={12} className="text-amber-400" />
                    ) : (
                      <Image size={12} className="text-green-400" />
                    )}
                    <span className="flex-1 truncate text-white">{d.label || n.id}</span>
                    <span className="text-[9px] text-[var(--color-text-secondary)]">
                      {d.nodeType === NodeType.VIDEO ? '视频' : '图片'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Export helpers ──

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'video/webm';
}

function drawCover(
  source: HTMLVideoElement | HTMLImageElement,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
) {
  const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;

  if (!sw || !sh) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const scale = Math.max(canvas.width / sw, canvas.height / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (canvas.width - dw) / 2;
  const dy = (canvas.height - dh) / 2;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, dx, dy, dw, dh);
}

function renderVideoClipToCanvas(
  src: string,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): Promise<void> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.src = src;

    const onError = () => {
      cleanup();
      resolve();
    };

    const onCanPlay = () => {
      video.removeEventListener('canplay', onCanPlay);
      video.play().catch(() => { onError(); });

      const tick = () => {
        if (video.paused || video.ended) return;
        drawCover(video, ctx, canvas);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const onEnded = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.pause();
      video.src = '';
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.load();
  });
}

function renderImageClipToCanvas(
  src: string,
  duration: number,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawCover(img, ctx, canvas);
      const totalFrames = duration * EXPORT_FPS;
      let frame = 0;
      const tick = () => {
        if (frame >= totalFrames) {
          resolve();
          return;
        }
        drawCover(img, ctx, canvas);
        frame++;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

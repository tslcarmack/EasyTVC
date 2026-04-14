import { useState, useCallback, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  Image,
  Film,
  AudioLines,
  Layers,
  Zap,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { GenerationType, getModelsForType, NodeType } from '@easytvc/shared';
import {
  usePipelineStore,
  type PipelineStep,
} from '../../stores/pipelineStore';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';

interface PipelinePanelProps {
  scriptNodeId: string;
  onClose: () => void;
}

const STEPS: Array<{ step: PipelineStep; label: string; icon: typeof FileText }> = [
  { step: 1, label: '脚本分析', icon: FileText },
  { step: 2, label: '分镜图片', icon: Image },
  { step: 3, label: '视频生成', icon: Film },
  { step: 4, label: '音频生成', icon: AudioLines },
  { step: 5, label: '组装成片', icon: Layers },
];

export function PipelinePanel({ scriptNodeId, onClose }: PipelinePanelProps) {
  const {
    mode, setMode, status, currentStep, error,
    scenes, storyboardItems, videoItems, voiceover,
    imageModel, setImageModel, videoModel, setVideoModel, textModel, setTextModel,
    startPipeline, pausePipeline, resumePipeline, retryItem, proceedToNextStep, reset,
  } = usePipelineStore();

  const [showSettings, setShowSettings] = useState(false);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const imageModels = useMemo(() => getModelsForType(GenerationType.TEXT_TO_IMAGE), []);
  const videoModels = useMemo(() => getModelsForType(GenerationType.IMAGE_TO_VIDEO), []);
  const textModels = useMemo(() => getModelsForType(GenerationType.TEXT_TO_TEXT), []);

  const { connectedCharacters, connectedStyle } = useMemo(() => {
    const connectedIds = edges
      .filter((e) => e.target === scriptNodeId || e.source === scriptNodeId)
      .map((e) => (e.source === scriptNodeId ? e.target : e.source));
    const charNodes = nodes.filter(
      (n) => connectedIds.includes(n.id) && n.data.nodeType === NodeType.CHARACTER,
    );
    const styleNode = nodes.find(
      (n) => connectedIds.includes(n.id) && n.data.nodeType === NodeType.STYLE,
    );
    return {
      connectedCharacters: charNodes.map((n) => {
        const d = n.data as EasyTVCNodeData;
        return {
          name: (d.characterName as string) || d.label || '',
          hasRefImages: ((d.referenceImages as string[]) || []).length > 0,
          hasDesc: !!(d.aiDescription || d.description),
        };
      }),
      connectedStyle: styleNode ? {
        label: (styleNode.data as EasyTVCNodeData).label || 'Style',
        keywords: ((styleNode.data as EasyTVCNodeData).keywords as string[]) || [],
        hasRefImages: (((styleNode.data as EasyTVCNodeData).referenceImages as string[]) || []).length > 0,
      } : null,
    };
  }, [nodes, edges, scriptNodeId]);

  const handleStart = useCallback(() => {
    startPipeline(scriptNodeId);
  }, [scriptNodeId, startPipeline]);

  const handleClose = useCallback(() => {
    if (status === 'running') {
      pausePipeline();
    }
    onClose();
  }, [status, pausePipeline, onClose]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const totalImages = storyboardItems.length;
  const completedImages = storyboardItems.filter((i) => i.status === 'completed').length;
  const totalVideos = videoItems.length;
  const completedVideos = videoItems.filter((i) => i.status === 'completed').length;

  const progressPercent = useMemo(() => {
    if (status === 'idle') return 0;
    let total = 0;
    let done = 0;

    // Step 1 = 10%
    total += 10;
    if (currentStep > 1) done += 10;
    else if (status === 'running' && currentStep === 1) done += 5;

    // Step 2 = 35%
    total += 35;
    if (currentStep > 2) done += 35;
    else if (currentStep === 2 && totalImages > 0) done += Math.round((completedImages / totalImages) * 35);

    // Step 3 = 35%
    total += 35;
    if (currentStep > 3) done += 35;
    else if (currentStep === 3 && totalVideos > 0) done += Math.round((completedVideos / totalVideos) * 35);

    // Step 4 = 10%
    total += 10;
    if (currentStep > 4) done += 10;
    else if (currentStep === 4 && voiceover?.status === 'completed') done += 10;

    // Step 5 = 10%
    total += 10;
    if (status === 'completed') done += 10;

    return Math.round((done / total) * 100);
  }, [status, currentStep, totalImages, completedImages, totalVideos, completedVideos, voiceover]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex h-[80vh] w-[900px] max-w-[95vw] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-4">
          <Zap size={20} className="text-[var(--color-primary)]" />
          <h2 className="flex-1 text-base font-semibold text-white">一键成片</h2>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-[var(--color-border)] p-0.5">
            <button
              onClick={() => setMode('quick')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                mode === 'quick'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              快速模式
            </button>
            <button
              onClick={() => setMode('precise')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                mode === 'precise'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              精细模式
            </button>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:text-white transition"
          >
            <Settings2 size={16} />
          </button>

          <button onClick={handleClose} className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:text-white transition">
            <X size={16} />
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-3">
            <div className="flex items-center gap-6">
              <ModelSelect label="文本模型" models={textModels} value={textModel} onChange={setTextModel} />
              <ModelSelect label="图片模型" models={imageModels} value={imageModel} onChange={setImageModel} />
              <ModelSelect label="视频模型" models={videoModels} value={videoModel} onChange={setVideoModel} />
            </div>
          </div>
        )}

        {/* Step indicators */}
        <div className="flex items-center gap-1 border-b border-[var(--color-border)] px-6 py-3">
          {STEPS.map(({ step, label, icon: Icon }, i) => {
            const isActive = currentStep === step;
            const isDone = currentStep > step || status === 'completed';
            const isFuture = currentStep < step && status !== 'completed';

            return (
              <div key={step} className="flex items-center">
                {i > 0 && (
                  <ChevronRight
                    size={14}
                    className={`mx-1 ${isDone ? 'text-green-400' : 'text-[var(--color-text-secondary)]/30'}`}
                  />
                )}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    isDone
                      ? 'bg-green-500/10 text-green-400'
                      : isActive
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'text-[var(--color-text-secondary)]/50'
                  }`}
                >
                  {isDone ? (
                    <Check size={12} />
                  ) : isActive && status === 'running' ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Icon size={12} />
                  )}
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {status === 'idle' && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Zap size={48} className="text-[var(--color-primary)]/30" />
              <div>
                <h3 className="text-lg font-semibold text-white">准备开始</h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  连接角色设定和风格设定节点可提升一致性
                </p>
              </div>

              <div className="w-full max-w-md space-y-2 rounded-xl bg-[var(--color-bg)] p-4 text-left">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" />
                  <span className="text-xs text-white">脚本已就绪</span>
                </div>

                <div className="flex items-center gap-2">
                  {connectedCharacters.length > 0 ? (
                    <Check size={14} className="text-green-400" />
                  ) : (
                    <AlertCircle size={14} className="text-yellow-400" />
                  )}
                  <span className="text-xs text-white">
                    {connectedCharacters.length > 0
                      ? `${connectedCharacters.length} 个角色: ${connectedCharacters.map((c) => c.name || '未命名').join(', ')}`
                      : '未连接角色节点（可选，但建议添加以保持一致性）'}
                  </span>
                </div>
                {connectedCharacters.map((c, i) => (
                  <div key={i} className="ml-6 flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)]">
                    <span>{c.name}</span>
                    <span>·</span>
                    <span className={c.hasRefImages ? 'text-green-400' : 'text-yellow-400'}>
                      {c.hasRefImages ? '有参考图' : '无参考图'}
                    </span>
                    <span>·</span>
                    <span className={c.hasDesc ? 'text-green-400' : 'text-yellow-400'}>
                      {c.hasDesc ? '有描述' : '无描述'}
                    </span>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  {connectedStyle ? (
                    <Check size={14} className="text-green-400" />
                  ) : (
                    <AlertCircle size={14} className="text-yellow-400" />
                  )}
                  <span className="text-xs text-white">
                    {connectedStyle
                      ? `风格: ${connectedStyle.label}${connectedStyle.keywords.length > 0 ? ` (${connectedStyle.keywords.slice(0, 3).join(', ')})` : ''}`
                      : '未连接风格节点（可选，但建议添加以统一画风）'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Step 1 result: scenes */}
          {currentStep >= 2 && scenes.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-white">
                脚本分析结果 ({scenes.length} 个场景)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {scenes.map((scene, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white">
                        {i + 1}. {scene.title}
                      </span>
                      <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
                        {scene.shotType} · {scene.duration}s
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
                      {scene.description}
                    </p>
                    {scene.characters.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {scene.characters.map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-pink-500/10 px-1.5 py-0.5 text-[9px] text-pink-400"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 result: storyboard images */}
          {storyboardItems.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-white">
                分镜图片 ({completedImages}/{totalImages})
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {storyboardItems.map((item, i) => (
                  <div
                    key={i}
                    className="group relative aspect-video overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                  >
                    {item.src ? (
                      <img src={item.src} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        {item.status === 'generating' ? (
                          <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
                        ) : item.status === 'failed' ? (
                          <AlertCircle size={20} className="text-red-400" />
                        ) : (
                          <Image size={20} className="text-[var(--color-text-secondary)]/30" />
                        )}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 px-2 py-1">
                      <span className="text-[9px] text-white">{scenes[item.sceneIndex]?.title}</span>
                    </div>
                    {item.status === 'failed' && (
                      <button
                        onClick={() => retryItem(2, item.sceneIndex)}
                        className="absolute right-1 top-1 hidden rounded bg-[var(--color-primary)] p-1 text-white group-hover:block"
                        title="重新生成"
                      >
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 result: videos */}
          {videoItems.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-white">
                视频片段 ({completedVideos}/{totalVideos})
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {videoItems.map((item, i) => (
                  <div
                    key={i}
                    className="group relative aspect-video overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                  >
                    {item.src ? (
                      <video src={item.src} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        {item.status === 'generating' ? (
                          <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
                        ) : item.status === 'failed' ? (
                          <AlertCircle size={20} className="text-red-400" />
                        ) : (
                          <Film size={20} className="text-[var(--color-text-secondary)]/30" />
                        )}
                      </div>
                    )}
                    {item.status === 'failed' && (
                      <button
                        onClick={() => retryItem(3, item.sceneIndex)}
                        className="absolute right-1 top-1 hidden rounded bg-[var(--color-primary)] p-1 text-white group-hover:block"
                        title="重新生成"
                      >
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Audio */}
          {voiceover && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-white">音频</h4>
              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                <AudioLines size={16} className="text-[var(--color-primary)]" />
                <span className="text-xs text-white">旁白配音</span>
                <div className="flex-1" />
                {voiceover.status === 'generating' && <Loader2 size={14} className="animate-spin text-[var(--color-primary)]" />}
                {voiceover.status === 'completed' && <Check size={14} className="text-green-400" />}
                {voiceover.status === 'failed' && <AlertCircle size={14} className="text-red-400" />}
              </div>
            </div>
          )}

          {/* Completed */}
          {status === 'completed' && (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-green-500/5 py-6">
              <Check size={32} className="text-green-400" />
              <h3 className="text-base font-semibold text-white">生成完成</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                所有素材已生成并排列在画布上，请在时间线中查看和导出
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-[var(--color-border)] px-6 py-4">
          {/* Progress bar */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-[var(--color-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">{progressPercent}%</span>
            </div>
          </div>

          {/* Action buttons */}
          {status === 'idle' && (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary)]/80"
            >
              <Play size={14} />
              开始生成
            </button>
          )}

          {status === 'running' && (
            <button
              onClick={pausePipeline}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-white transition hover:bg-[var(--color-surface-hover)]"
            >
              <Pause size={14} />
              暂停
            </button>
          )}

          {status === 'paused' && (
            <>
              <button
                onClick={resumePipeline}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary)]/80"
              >
                <SkipForward size={14} />
                继续下一步
              </button>
            </>
          )}

          {status === 'failed' && (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary)]/80"
            >
              <RotateCcw size={14} />
              重试
            </button>
          )}

          {status === 'completed' && (
            <button
              onClick={handleClose}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              <Check size={14} />
              完成
            </button>
          )}

          {status !== 'idle' && status !== 'completed' && (
            <button
              onClick={handleReset}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition hover:text-white"
            >
              重置
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModelSelect({
  label,
  models,
  value,
  onChange,
}: {
  label: string;
  models: Array<{ id: string; name: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-text-secondary)]">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-white outline-none"
      >
        <option value="">自动</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  );
}

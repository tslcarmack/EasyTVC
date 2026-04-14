import { create } from 'zustand';
import { apiFetch } from '../api/client';
import { NodeType, GenerationType } from '@easytvc/shared';
import { useCanvasStore, type EasyTVCNodeData } from './canvasStore';
import { useGenerationStore } from './generationStore';

export interface EnhancedScene {
  title: string;
  description: string;
  duration: number;
  characters: string[];
  shotType: string;
}

interface CharacterInfo {
  nodeId: string;
  name: string;
  description: string;
  referenceImages: string[];
}

interface StyleInfo {
  nodeId: string;
  description: string;
  keywords: string[];
  referenceImages: string[];
}

export type PipelineStep = 1 | 2 | 3 | 4 | 5;
export type PipelineStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';
export type ItemStatus = 'pending' | 'generating' | 'completed' | 'failed';

interface StoryboardItem {
  sceneIndex: number;
  nodeId: string;
  status: ItemStatus;
  src?: string;
}

interface VideoItem {
  sceneIndex: number;
  nodeId: string;
  status: ItemStatus;
  src?: string;
}

interface AudioItem {
  nodeId: string;
  status: ItemStatus;
  src?: string;
}

interface PipelineState {
  mode: 'quick' | 'precise';
  currentStep: PipelineStep;
  status: PipelineStatus;
  error: string | null;

  scriptNodeId: string | null;
  characters: CharacterInfo[];
  style: StyleInfo | null;
  scenes: EnhancedScene[];

  storyboardItems: StoryboardItem[];
  videoItems: VideoItem[];
  voiceover: AudioItem | null;
  bgm: AudioItem | null;
  timelineClips: string[];

  imageModel: string;
  videoModel: string;
  textModel: string;

  setMode: (mode: 'quick' | 'precise') => void;
  setImageModel: (model: string) => void;
  setVideoModel: (model: string) => void;
  setTextModel: (model: string) => void;

  startPipeline: (scriptNodeId: string) => Promise<void>;
  pausePipeline: () => void;
  resumePipeline: () => void;
  retryItem: (step: PipelineStep, sceneIndex: number) => Promise<void>;
  proceedToNextStep: () => Promise<void>;
  reset: () => void;
}

const MAX_CONCURRENT = 3;

function getConnectedCharacters(scriptNodeId: string): CharacterInfo[] {
  const { nodes, edges } = useCanvasStore.getState();
  const connectedIds = edges
    .filter((e) => e.target === scriptNodeId || e.source === scriptNodeId)
    .map((e) => (e.source === scriptNodeId ? e.target : e.source));

  return nodes
    .filter((n) => connectedIds.includes(n.id) && n.data.nodeType === NodeType.CHARACTER)
    .map((n) => {
      const d = n.data as EasyTVCNodeData;
      return {
        nodeId: n.id,
        name: (d.characterName as string) || d.label || '',
        description: (d.aiDescription as string) || (d.description as string) || '',
        referenceImages: (d.referenceImages as string[]) || [],
      };
    });
}

function getConnectedStyle(scriptNodeId: string): StyleInfo | null {
  const { nodes, edges } = useCanvasStore.getState();
  const connectedIds = edges
    .filter((e) => e.target === scriptNodeId || e.source === scriptNodeId)
    .map((e) => (e.source === scriptNodeId ? e.target : e.source));

  const styleNode = nodes.find(
    (n) => connectedIds.includes(n.id) && n.data.nodeType === NodeType.STYLE,
  );

  if (!styleNode) return null;
  const d = styleNode.data as EasyTVCNodeData;
  return {
    nodeId: styleNode.id,
    description: (d.description as string) || '',
    keywords: (d.keywords as string[]) || [],
    referenceImages: (d.referenceImages as string[]) || [],
  };
}

async function runConcurrent<T>(
  items: T[],
  fn: (item: T, index: number) => Promise<void>,
  concurrency: number,
  shouldStop: () => boolean,
): Promise<void> {
  let index = 0;
  const run = async () => {
    while (index < items.length && !shouldStop()) {
      const current = index++;
      await fn(items[current], current);
    }
  };
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(workers);
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  mode: 'quick',
  currentStep: 1,
  status: 'idle',
  error: null,

  scriptNodeId: null,
  characters: [],
  style: null,
  scenes: [],

  storyboardItems: [],
  videoItems: [],
  voiceover: null,
  bgm: null,
  timelineClips: [],

  imageModel: '',
  videoModel: '',
  textModel: '',

  setMode: (mode) => set({ mode }),
  setImageModel: (model) => set({ imageModel: model }),
  setVideoModel: (model) => set({ videoModel: model }),
  setTextModel: (model) => set({ textModel: model }),

  startPipeline: async (scriptNodeId: string) => {
    const canvasStore = useCanvasStore.getState();
    const scriptNode = canvasStore.nodes.find((n) => n.id === scriptNodeId);
    if (!scriptNode) return;

    const script = (scriptNode.data as EasyTVCNodeData).content as string;
    if (!script?.trim()) return;

    const characters = getConnectedCharacters(scriptNodeId);
    const style = getConnectedStyle(scriptNodeId);

    console.log('[Pipeline] Connected characters:', characters.length, characters.map((c) => ({
      name: c.name,
      hasDesc: !!c.description,
      refImages: c.referenceImages.length,
    })));
    console.log('[Pipeline] Connected style:', style ? {
      desc: style.description.slice(0, 50),
      keywords: style.keywords,
      refImages: style.referenceImages.length,
    } : 'none');

    set({
      status: 'running',
      currentStep: 1,
      error: null,
      scriptNodeId,
      characters,
      style,
      scenes: [],
      storyboardItems: [],
      videoItems: [],
      voiceover: null,
      bgm: null,
      timelineClips: [],
    });

    try {
      // Step 1: Parse storyboard
      const { textModel } = get();
      const res = await apiFetch<{ scenes: EnhancedScene[] }>('/generate/parse-storyboard', {
        method: 'POST',
        body: JSON.stringify({
          script,
          model: textModel || undefined,
          characterNames: characters.map((c) => c.name),
        }),
      });

      if (!res.success || !res.data?.scenes?.length) {
        set({ status: 'failed', error: res.error || '脚本分析失败' });
        return;
      }

      set({ scenes: res.data.scenes, currentStep: 2 });

      if (get().mode === 'precise') {
        set({ status: 'paused' });
        return;
      }

      await get().proceedToNextStep();
    } catch (err: any) {
      set({ status: 'failed', error: err.message });
    }
  },

  pausePipeline: () => {
    set({ status: 'paused' });
  },

  resumePipeline: () => {
    const { status } = get();
    if (status === 'paused') {
      set({ status: 'running' });
      get().proceedToNextStep();
    }
  },

  retryItem: async (step, sceneIndex) => {
    if (step === 2) {
      const state = get();
      const item = state.storyboardItems[sceneIndex];
      if (!item) return;

      set({
        storyboardItems: state.storyboardItems.map((it, i) =>
          i === sceneIndex ? { ...it, status: 'generating' as const } : it,
        ),
      });

      await generateSingleStoryboardImage(sceneIndex, get, set);
    } else if (step === 3) {
      const state = get();
      const item = state.videoItems[sceneIndex];
      if (!item) return;

      set({
        videoItems: state.videoItems.map((it, i) =>
          i === sceneIndex ? { ...it, status: 'generating' as const } : it,
        ),
      });

      await generateSingleVideo(sceneIndex, get, set);
    }
  },

  proceedToNextStep: async () => {
    const state = get();
    const step = state.currentStep;

    try {
      if (step === 2) {
        await runStep2_GenerateImages(get, set);
      } else if (step === 3) {
        await runStep3_GenerateVideos(get, set);
      } else if (step === 4) {
        await runStep4_GenerateAudio(get, set);
      } else if (step === 5) {
        await runStep5_AssembleTimeline(get, set);
      }
    } catch (err: any) {
      set({ status: 'failed', error: err.message });
    }
  },

  reset: () => {
    set({
      mode: 'quick',
      currentStep: 1,
      status: 'idle',
      error: null,
      scriptNodeId: null,
      characters: [],
      style: null,
      scenes: [],
      storyboardItems: [],
      videoItems: [],
      voiceover: null,
      bgm: null,
      timelineClips: [],
    });
  },
}));

function buildCompositePromptLocal(
  sceneDescription: string,
  characters: CharacterInfo[],
  style: StyleInfo | null,
  shotType?: string,
): { prompt: string; referenceImageUrls: string[] } {
  const parts: string[] = [];
  const allRefImages: string[] = [];

  if (style) {
    const kw = style.keywords.length > 0 ? ` (${style.keywords.join(', ')})` : '';
    parts.push(`Style: ${style.description}${kw}`);
    allRefImages.push(...style.referenceImages);
  }

  parts.push(`Scene: ${sceneDescription}`);

  for (const char of characters) {
    if (char.description) {
      parts.push(`Character "${char.name}": ${char.description}`);
    }
    allRefImages.push(...char.referenceImages);
  }

  if (shotType) {
    const shotMap: Record<string, string> = {
      'close-up': 'Close-up shot, face fills the frame',
      'medium': 'Medium shot, waist-up framing',
      'wide': 'Wide shot, full body with environment visible',
      'aerial': 'Aerial/bird\'s eye view shot',
      'over-shoulder': 'Over-the-shoulder shot',
      'low-angle': 'Low angle shot, looking up',
      'high-angle': 'High angle shot, looking down',
    };
    parts.push(`Composition: ${shotMap[shotType] || shotType}`);
  }

  return { prompt: parts.join('\n\n'), referenceImageUrls: allRefImages };
}

async function generateSingleStoryboardImage(
  sceneIndex: number,
  get: () => PipelineState,
  set: (partial: Partial<PipelineState> | ((s: PipelineState) => Partial<PipelineState>)) => void,
) {
  const { scenes, characters, style, imageModel } = get();
  const scene = scenes[sceneIndex];
  if (!scene) return;

  // Include ALL characters for every scene to guarantee consistency
  // If scene has specific character names, prioritize those; otherwise use all
  let sceneCharacters = characters;
  if (scene.characters.length > 0) {
    const matched = characters.filter((c) =>
      scene.characters.some((name) => c.name.includes(name) || name.includes(c.name)),
    );
    if (matched.length > 0) {
      sceneCharacters = matched;
    }
    // If no match found, still use ALL characters for consistency
  }

  const { prompt: compositePrompt, referenceImageUrls: refUrls } = buildCompositePromptLocal(
    scene.description,
    sceneCharacters,
    style,
    scene.shotType,
  );

  console.log(`[Pipeline] Scene ${sceneIndex + 1} prompt:`, compositePrompt.slice(0, 200));
  console.log(`[Pipeline] Scene ${sceneIndex + 1} refs:`, refUrls.length, 'images');

  const genRes = await apiFetch<any>('/generate/pipeline/generate-image', {
    method: 'POST',
    body: JSON.stringify({
      prompt: compositePrompt,
      referenceImageUrls: refUrls.length > 0 ? refUrls : undefined,
      width: 1792,
      height: 1024,
      model: imageModel || undefined,
      nodeId: get().storyboardItems[sceneIndex]?.nodeId,
    }),
  });

  const items = get().storyboardItems;
  if (genRes.success && genRes.data?.resultUrl) {
    const nodeId = items[sceneIndex]?.nodeId;
    if (nodeId) {
      useCanvasStore.getState().updateNodeData(nodeId, {
        src: genRes.data.resultUrl,
        generationStatus: 'completed',
      });
    }
    set({
      storyboardItems: items.map((it, i) =>
        i === sceneIndex ? { ...it, status: 'completed' as const, src: genRes.data.resultUrl } : it,
      ),
    });
  } else {
    set({
      storyboardItems: items.map((it, i) =>
        i === sceneIndex ? { ...it, status: 'failed' as const } : it,
      ),
    });
  }
}

async function runStep2_GenerateImages(
  get: () => PipelineState,
  set: (partial: Partial<PipelineState> | ((s: PipelineState) => Partial<PipelineState>)) => void,
) {
  const { scenes, scriptNodeId } = get();
  const canvasStore = useCanvasStore.getState();

  if (!scriptNodeId) return;
  const scriptNode = canvasStore.nodes.find((n) => n.id === scriptNodeId);
  const baseX = (scriptNode?.position.x ?? 0) + 400;
  const baseY = scriptNode?.position.y ?? 0;
  const cols = 3;
  const gapX = 450;
  const gapY = 380;

  const items: StoryboardItem[] = scenes.map((scene, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const position = { x: baseX + col * gapX, y: baseY + row * gapY };
    const nodeId = canvasStore.addNodeWithEdge(NodeType.IMAGE, position, scriptNodeId);
    canvasStore.updateNodeData(nodeId, {
      label: `${i + 1}. ${scene.title}`,
      lastPrompt: scene.description,
      duration: scene.duration,
      generationStatus: 'generating',
    });
    return { sceneIndex: i, nodeId, status: 'pending' as const };
  });

  set({ storyboardItems: items });

  await runConcurrent(
    items,
    async (_, idx) => {
      if (get().status === 'paused') return;
      set({
        storyboardItems: get().storyboardItems.map((it, i) =>
          i === idx ? { ...it, status: 'generating' as const } : it,
        ),
      });
      await generateSingleStoryboardImage(idx, get, set);
    },
    MAX_CONCURRENT,
    () => get().status === 'paused',
  );

  const finalItems = get().storyboardItems;
  const allDone = finalItems.every((it) => it.status === 'completed' || it.status === 'failed');

  if (allDone) {
    set({ currentStep: 3 });
    if (get().mode === 'precise') {
      set({ status: 'paused' });
      return;
    }
    await get().proceedToNextStep();
  }
}

async function generateSingleVideo(
  sceneIndex: number,
  get: () => PipelineState,
  set: (partial: Partial<PipelineState> | ((s: PipelineState) => Partial<PipelineState>)) => void,
) {
  const { storyboardItems, scenes, videoModel, scriptNodeId } = get();
  const imgItem = storyboardItems[sceneIndex];
  if (!imgItem?.src || !scriptNodeId) return;

  const scene = scenes[sceneIndex];
  const { generateForNode } = useGenerationStore.getState();

  const videoNodeId = get().videoItems[sceneIndex]?.nodeId;
  if (!videoNodeId) return;

  const result = await generateForNode(videoNodeId, GenerationType.IMAGE_TO_VIDEO, scene.description, {
    model: videoModel || undefined,
    imageUrl: imgItem.src,
    duration: Math.min(scene.duration, 10),
  });

  const vitems = get().videoItems;
  if (result?.resultUrl) {
    set({
      videoItems: vitems.map((it, i) =>
        i === sceneIndex ? { ...it, status: 'completed' as const, src: result.resultUrl } : it,
      ),
    });
  } else {
    set({
      videoItems: vitems.map((it, i) =>
        i === sceneIndex ? { ...it, status: 'failed' as const } : it,
      ),
    });
  }
}

async function runStep3_GenerateVideos(
  get: () => PipelineState,
  set: (partial: Partial<PipelineState> | ((s: PipelineState) => Partial<PipelineState>)) => void,
) {
  const { storyboardItems, scriptNodeId } = get();
  const canvasStore = useCanvasStore.getState();

  if (!scriptNodeId) return;

  const completedImages = storyboardItems.filter((it) => it.status === 'completed' && it.src);

  const videoItems: VideoItem[] = completedImages.map((imgItem) => {
    const imgNode = canvasStore.nodes.find((n) => n.id === imgItem.nodeId);
    const position = {
      x: (imgNode?.position.x ?? 0) + 450,
      y: imgNode?.position.y ?? 0,
    };
    const nodeId = canvasStore.addNodeWithEdge(NodeType.VIDEO, position, imgItem.nodeId);
    canvasStore.updateNodeData(nodeId, {
      label: `Video ${imgItem.sceneIndex + 1}`,
      generationStatus: 'generating',
    });
    return { sceneIndex: imgItem.sceneIndex, nodeId, status: 'pending' as const };
  });

  set({ videoItems });

  await runConcurrent(
    videoItems,
    async (item, idx) => {
      if (get().status === 'paused') return;
      set({
        videoItems: get().videoItems.map((it, i) =>
          i === idx ? { ...it, status: 'generating' as const } : it,
        ),
      });
      await generateSingleVideo(idx, get, set);
    },
    MAX_CONCURRENT,
    () => get().status === 'paused',
  );

  const finalItems = get().videoItems;
  const allDone = finalItems.every((it) => it.status === 'completed' || it.status === 'failed');

  if (allDone) {
    set({ currentStep: 4 });
    if (get().mode === 'precise') {
      set({ status: 'paused' });
      return;
    }
    await get().proceedToNextStep();
  }
}

async function runStep4_GenerateAudio(
  get: () => PipelineState,
  set: (partial: Partial<PipelineState> | ((s: PipelineState) => Partial<PipelineState>)) => void,
) {
  const { scenes, scriptNodeId } = get();
  const canvasStore = useCanvasStore.getState();

  if (!scriptNodeId) return;

  const scriptNode = canvasStore.nodes.find((n) => n.id === scriptNodeId);
  const baseX = (scriptNode?.position.x ?? 0);
  const baseY = (scriptNode?.position.y ?? 0) + 500;

  const voiceoverScript = scenes.map((s, i) => `第${i + 1}幕 ${s.title}: ${s.description}`).join('\n');

  const voiceNodeId = canvasStore.addNodeWithEdge(NodeType.AUDIO, { x: baseX + 400, y: baseY }, scriptNodeId);
  canvasStore.updateNodeData(voiceNodeId, {
    label: '旁白配音',
    generationStatus: 'generating',
  });

  set({ voiceover: { nodeId: voiceNodeId, status: 'generating' } });

  const { generateForNode } = useGenerationStore.getState();
  const voiceResult = await generateForNode(voiceNodeId, GenerationType.TEXT_TO_AUDIO, voiceoverScript);

  set({
    voiceover: {
      nodeId: voiceNodeId,
      status: voiceResult?.resultUrl ? 'completed' : 'failed',
      src: voiceResult?.resultUrl || undefined,
    },
  });

  set({ currentStep: 5 });
  if (get().mode === 'precise') {
    set({ status: 'paused' });
    return;
  }
  await get().proceedToNextStep();
}

async function runStep5_AssembleTimeline(
  get: () => PipelineState,
  set: (partial: Partial<PipelineState> | ((s: PipelineState) => Partial<PipelineState>)) => void,
) {
  const { videoItems, storyboardItems } = get();

  const completedVideos = videoItems.filter((it) => it.status === 'completed');
  const completedImages = storyboardItems.filter((it) => it.status === 'completed');

  const clips = completedVideos.length > 0
    ? completedVideos.map((v) => v.nodeId)
    : completedImages.map((img) => img.nodeId);

  set({
    timelineClips: clips,
    status: 'completed',
  });
}

import { create } from 'zustand';
import { apiFetch } from '../api/client';
import { GenerationType, type GenerationTaskInfo } from '@easytvc/shared';
import { useCanvasStore } from './canvasStore';

interface GenerationState {
  tasks: Record<string, GenerationTaskInfo>;

  generateForNode: (
    nodeId: string,
    type: GenerationType,
    prompt: string,
    options?: {
      model?: string;
      provider?: string;
      imageUrl?: string;
      imageUrls?: string[];
      endImageUrl?: string;
      videoUrl?: string;
      voiceId?: string;
      width?: number;
      height?: number;
      duration?: number;
      negativePrompt?: string;
      strength?: number;
    },
  ) => Promise<GenerationTaskInfo | null>;

  pollTask: (taskId: string) => Promise<GenerationTaskInfo | null>;
  loadTasks: () => Promise<void>;
}

function addTask(set: any, task: GenerationTaskInfo) {
  set((state: GenerationState) => ({
    tasks: { ...state.tasks, [task.id]: task },
  }));
}

const TYPE_TO_ENDPOINT: Record<GenerationType, string> = {
  [GenerationType.TEXT_TO_TEXT]: '/generate/text-to-text',
  [GenerationType.TEXT_TO_IMAGE]: '/generate/text-to-image',
  [GenerationType.TEXT_TO_VIDEO]: '/generate/text-to-video',
  [GenerationType.TEXT_TO_AUDIO]: '/generate/text-to-audio',
  [GenerationType.IMAGE_TO_TEXT]: '/generate/image-to-text',
  [GenerationType.IMAGE_TO_IMAGE]: '/generate/image-to-image',
  [GenerationType.IMAGE_TO_VIDEO]: '/generate/image-to-video',
  [GenerationType.VIDEO_TO_TEXT]: '/generate/video-to-text',
  [GenerationType.VIDEO_TO_VIDEO]: '/generate/video-to-video',
};

function buildRequestBody(
  type: GenerationType,
  prompt: string,
  nodeId: string,
  options?: Record<string, unknown>,
): Record<string, unknown> {
  const base: Record<string, unknown> = { nodeId };

  switch (type) {
    case GenerationType.TEXT_TO_TEXT:
      return { ...base, prompt, model: options?.model, provider: options?.provider };
    case GenerationType.TEXT_TO_IMAGE:
      return { ...base, prompt, model: options?.model, provider: options?.provider, width: options?.width, height: options?.height, negativePrompt: options?.negativePrompt, referenceImageUrls: options?.imageUrls };
    case GenerationType.TEXT_TO_VIDEO:
      return { ...base, prompt, model: options?.model, provider: options?.provider, duration: options?.duration, width: options?.width, height: options?.height };
    case GenerationType.TEXT_TO_AUDIO:
      return { ...base, prompt, model: options?.model, provider: options?.provider, voiceId: options?.voiceId };
    case GenerationType.IMAGE_TO_TEXT:
      return { ...base, imageUrl: options?.imageUrl, prompt, model: options?.model, provider: options?.provider };
    case GenerationType.IMAGE_TO_IMAGE:
      return { ...base, imageUrl: options?.imageUrl, prompt, strength: options?.strength, model: options?.model, provider: options?.provider };
    case GenerationType.IMAGE_TO_VIDEO:
      return { ...base, imageUrl: options?.imageUrl, endImageUrl: options?.endImageUrl, prompt, duration: options?.duration, model: options?.model, provider: options?.provider };
    case GenerationType.VIDEO_TO_TEXT:
      return { ...base, videoUrl: options?.videoUrl, prompt, model: options?.model, provider: options?.provider };
    case GenerationType.VIDEO_TO_VIDEO:
      return { ...base, videoUrl: options?.videoUrl, prompt, duration: options?.duration, model: options?.model, provider: options?.provider };
  }
}

export const useGenerationStore = create<GenerationState>((set) => ({
  tasks: {},

  generateForNode: async (nodeId, type, prompt, options) => {
    const canvasStore = useCanvasStore.getState();
    canvasStore.updateNodeData(nodeId, {
      generationStatus: 'generating',
      generationError: undefined,
      lastPrompt: prompt,
      lastModel: options?.model || '',
    });

    const endpoint = TYPE_TO_ENDPOINT[type];
    const body = buildRequestBody(type, prompt, nodeId, options);

    try {
      const res = await apiFetch<GenerationTaskInfo>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.success && res.data) {
        addTask(set, res.data);

        const resultData: Record<string, unknown> = {
          generationStatus: 'completed' as const,
          generationTaskId: res.data.id,
          generationError: undefined,
        };

        if (res.data.resultUrl) {
          resultData.src = res.data.resultUrl;
        }
        if (res.data.resultText) {
          resultData.content = res.data.resultText;
        }

        canvasStore.updateNodeData(nodeId, resultData);
        return res.data;
      }

      canvasStore.updateNodeData(nodeId, {
        generationStatus: 'failed',
        generationError: 'Generation request failed',
      });
      return null;
    } catch (err: any) {
      canvasStore.updateNodeData(nodeId, {
        generationStatus: 'failed',
        generationError: err.message || 'Generation failed',
      });
      return null;
    }
  },

  pollTask: async (taskId) => {
    const res = await apiFetch<GenerationTaskInfo>(`/generate/tasks/${taskId}`);
    if (res.success && res.data) {
      addTask(set, res.data);
      return res.data;
    }
    return null;
  },

  loadTasks: async () => {
    const res = await apiFetch<GenerationTaskInfo[]>('/generate/tasks?limit=20');
    if (res.success && res.data) {
      const taskMap: Record<string, GenerationTaskInfo> = {};
      for (const t of res.data) taskMap[t.id] = t;
      set({ tasks: taskMap });
    }
  },
}));

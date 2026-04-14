export enum GenerationType {
  TEXT_TO_TEXT = 'text_to_text',
  TEXT_TO_IMAGE = 'text_to_image',
  TEXT_TO_VIDEO = 'text_to_video',
  TEXT_TO_AUDIO = 'text_to_audio',
  IMAGE_TO_TEXT = 'image_to_text',
  IMAGE_TO_IMAGE = 'image_to_image',
  IMAGE_TO_VIDEO = 'image_to_video',
  VIDEO_TO_TEXT = 'video_to_text',
  VIDEO_TO_VIDEO = 'video_to_video',
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AIProvider {
  OPENAI = 'openai',
  REPLICATE = 'replicate',
  GOOGLE = 'google',
  MOCK = 'mock',
}

export interface GenerationTaskInfo {
  id: string;
  type: GenerationType;
  status: TaskStatus;
  provider: string;
  model: string;
  prompt?: string;
  inputFileUrl?: string;
  inputFileUrl2?: string;
  resultUrl?: string;
  resultText?: string;
  error?: string;
  progress?: number;
  nodeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TextToTextRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  provider?: string;
}

export interface TextToImageRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  model?: string;
  provider?: string;
  nodeId?: string;
}

export interface TextToVideoRequest {
  prompt: string;
  duration?: number;
  width?: number;
  height?: number;
  model?: string;
  provider?: string;
  nodeId?: string;
}

export interface ImageToTextRequest {
  imageUrl: string;
  prompt?: string;
  model?: string;
  provider?: string;
}

export interface ImageToImageRequest {
  imageUrl: string;
  prompt: string;
  strength?: number;
  model?: string;
  provider?: string;
  nodeId?: string;
}

export interface ImageToVideoRequest {
  imageUrl: string;
  endImageUrl?: string;
  prompt?: string;
  duration?: number;
  model?: string;
  provider?: string;
  nodeId?: string;
}

export interface VideoToTextRequest {
  videoUrl: string;
  prompt?: string;
  model?: string;
  provider?: string;
}

export interface VideoToVideoRequest {
  videoUrl: string;
  prompt?: string;
  duration?: number;
  model?: string;
  provider?: string;
  nodeId?: string;
}

export interface TextToAudioRequest {
  prompt: string;
  voiceId?: string;
  model?: string;
  provider?: string;
  nodeId?: string;
}

export interface AIModelInfo {
  id: string;
  name: string;
  provider: AIProvider;
  types: GenerationType[];
  description?: string;
}

export const AVAILABLE_MODELS: AIModelInfo[] = [
  // ═══════════════════════════════════════════
  // 文本模型 (脚本分析 / 角色描述 / 图片理解)
  // ═══════════════════════════════════════════
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT],
    description: '快速低成本' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT, GenerationType.VIDEO_TO_TEXT],
    description: '多模态均衡' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT],
    description: '新一代轻量' },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT],
    description: '新一代标准' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT],
    description: '最新紧凑型' },
  { id: 'gpt-5', name: 'GPT-5', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT],
    description: '最新旗舰' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT],
    description: 'Gemini 快速' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT],
    description: 'Gemini 专业' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT],
    description: 'DeepSeek 开源' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT],
    description: 'Anthropic 高质量' },
  { id: 'qwen3-max', name: 'Qwen3 Max', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_TEXT, GenerationType.IMAGE_TO_TEXT],
    description: '通义千问旗舰' },

  // ═══════════════════════════════════════════
  // 图片生成模型
  // ═══════════════════════════════════════════
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'Gemini 3 图片生成' },
  { id: 'gemini-3-pro-image-preview-4k', name: 'Gemini 3 Pro 4K', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'Gemini 3 图片 4K' },
  { id: 'gemini-3-pro-image-preview-2k', name: 'Gemini 3 Pro 2K', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'Gemini 3 图片 2K' },
  { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'Gemini 3.1 快速图片' },
  { id: 'gemini-3.1-flash-image-preview-4k', name: 'Gemini 3.1 Flash 4K', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'Gemini 3.1 快速 4K' },
  { id: 'gemini-3.1-flash-image-preview-2k', name: 'Gemini 3.1 Flash 2K', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'Gemini 3.1 快速 2K' },
  { id: 'gemini-2.5-flash-image-preview', name: 'Gemini 2.5 Flash Image', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'Gemini 2.5 图片' },
  { id: 'gpt-image-1', name: 'GPT Image 1', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'OpenAI 图片生成' },
  { id: 'gpt-image-1.5', name: 'GPT Image 1.5', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'OpenAI 图片生成 v1.5' },
  { id: 'gpt-4o-image', name: 'GPT-4o Image', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'GPT-4o 原生图片' },
  { id: 'grok-4-1-image', name: 'Grok 4.1 Image', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'xAI Grok 图片生成' },
  { id: 'qwen-image-2.0', name: 'Qwen Image 2.0', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: '通义万相' },
  { id: 'qwen-image-2.0-pro', name: 'Qwen Image 2.0 Pro', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: '通义万相 Pro' },
  { id: 'wan2.7-image', name: 'Wanx 2.7 Image', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: '万象图片' },
  { id: 'wan2.7-image-pro', name: 'Wanx 2.7 Image Pro', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: '万象图片 Pro' },
  { id: 'nano-banana', name: 'Nano Banana', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'Nano Banana' },
  { id: 'nano-banana-2', name: 'Nano Banana 2', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: 'Nano Banana 2' },
  { id: 'Z-Image-Turbo', name: 'Z-Image Turbo', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_IMAGE],
    description: '极速图片生成' },

  // ═══════════════════════════════════════════
  // 视频生成模型
  // ═══════════════════════════════════════════
  { id: 'wan2.7-t2v-1080P', name: 'Wanx 2.7 文生视频 1080P', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_VIDEO],
    description: '万象 文本生成视频 1080P' },
  { id: 'wan2.7-t2v-720P', name: 'Wanx 2.7 文生视频 720P', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_VIDEO],
    description: '万象 文本生成视频 720P' },
  { id: 'wan2.7-i2v-1080P', name: 'Wanx 2.7 图生视频 1080P', provider: AIProvider.OPENAI,
    types: [GenerationType.IMAGE_TO_VIDEO],
    description: '万象 图片生成视频 1080P' },
  { id: 'wan2.7-i2v-720P', name: 'Wanx 2.7 图生视频 720P', provider: AIProvider.OPENAI,
    types: [GenerationType.IMAGE_TO_VIDEO],
    description: '万象 图片生成视频 720P' },
  { id: 'wan2.6-i2v-flash-1080P', name: 'Wanx 2.6 图生视频 Flash 1080P', provider: AIProvider.OPENAI,
    types: [GenerationType.IMAGE_TO_VIDEO],
    description: '万象 快速图生视频 1080P' },
  { id: 'wan2.6-i2v-flash-720P', name: 'Wanx 2.6 图生视频 Flash 720P', provider: AIProvider.OPENAI,
    types: [GenerationType.IMAGE_TO_VIDEO],
    description: '万象 快速图生视频 720P' },
  { id: 'wan2.2-kf2v-flash-1080P', name: 'Wanx 2.2 关键帧 1080P', provider: AIProvider.OPENAI,
    types: [GenerationType.IMAGE_TO_VIDEO],
    description: '首尾帧生成视频 1080P' },
  { id: 'wan2.2-kf2v-flash-720P', name: 'Wanx 2.2 关键帧 720P', provider: AIProvider.OPENAI,
    types: [GenerationType.IMAGE_TO_VIDEO],
    description: '首尾帧生成视频 720P' },
  { id: 'veo3.1', name: 'Veo 3.1', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_VIDEO, GenerationType.IMAGE_TO_VIDEO],
    description: 'Google Veo 视频' },
  { id: 'veo3.1-fast', name: 'Veo 3.1 Fast', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_VIDEO, GenerationType.IMAGE_TO_VIDEO],
    description: 'Google Veo 快速' },
  { id: 'seedance-2.0', name: 'Seedance 2.0', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_VIDEO, GenerationType.IMAGE_TO_VIDEO],
    description: 'Seedance 视频' },
  { id: 'sora-2-nx', name: 'Sora 2', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_VIDEO, GenerationType.IMAGE_TO_VIDEO],
    description: 'OpenAI Sora 视频' },
  { id: 'grok-video-3', name: 'Grok Video 3', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_VIDEO],
    description: 'xAI Grok 视频' },
  { id: 'grok-video-4.2', name: 'Grok Video 4.2', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_VIDEO],
    description: 'xAI Grok 视频最新' },
  { id: 'wan2.7-videoedit-1080P', name: 'Wanx 2.7 视频编辑 1080P', provider: AIProvider.OPENAI,
    types: [GenerationType.VIDEO_TO_VIDEO],
    description: '万象 视频编辑' },

  // ═══════════════════════════════════════════
  // 音频/TTS 模型
  // ═══════════════════════════════════════════
  { id: 'tts-1-hd', name: 'TTS-1 HD', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_AUDIO],
    description: 'OpenAI 高清语音' },
  { id: 'tts-1', name: 'TTS-1', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_AUDIO],
    description: 'OpenAI 标准语音' },
  { id: 'gpt-4o-mini-tts', name: 'GPT-4o Mini TTS', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_AUDIO],
    description: 'GPT-4o Mini 语音合成' },
  { id: 'cosyvoice-v3-plus', name: 'CosyVoice V3 Plus', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_AUDIO],
    description: '通义语音 高质量' },
  { id: 'cosyvoice-v3-flash', name: 'CosyVoice V3 Flash', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_AUDIO],
    description: '通义语音 快速' },
  { id: 'qwen3-tts-flash', name: 'Qwen3 TTS Flash', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_AUDIO],
    description: 'Qwen3 语音快速' },

  // ═══════════════════════════════════════════
  // 音乐生成
  // ═══════════════════════════════════════════
  { id: 'suno_music', name: 'Suno Music', provider: AIProvider.OPENAI,
    types: [GenerationType.TEXT_TO_AUDIO],
    description: 'Suno AI 音乐生成' },

  // ═══════════════════════════════════════════
  // Dev
  // ═══════════════════════════════════════════
  { id: 'mock-model', name: 'Mock Model (Dev)', provider: AIProvider.MOCK,
    types: [
      GenerationType.TEXT_TO_TEXT, GenerationType.TEXT_TO_IMAGE, GenerationType.TEXT_TO_VIDEO,
      GenerationType.TEXT_TO_AUDIO, GenerationType.IMAGE_TO_TEXT, GenerationType.IMAGE_TO_IMAGE,
      GenerationType.IMAGE_TO_VIDEO, GenerationType.VIDEO_TO_TEXT, GenerationType.VIDEO_TO_VIDEO,
    ],
    description: '开发测试' },
];

export function getModelsForType(type: GenerationType): AIModelInfo[] {
  return AVAILABLE_MODELS.filter((m) => m.types.includes(type));
}

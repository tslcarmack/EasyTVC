export const API_BASE_URL = '/api';

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];

export const DEFAULT_NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  text: { width: 300, height: 200 },
  image: { width: 400, height: 300 },
  video: { width: 480, height: 320 },
  audio: { width: 400, height: 250 },
  document: { width: 350, height: 250 },
  table: { width: 400, height: 300 },
  image_editor: { width: 500, height: 400 },
  frame: { width: 800, height: 600 },
  character: { width: 320, height: 400 },
  style: { width: 320, height: 360 },
};

export const CANVAS_DEFAULT_VIEWPORT = {
  x: 0,
  y: 0,
  zoom: 1,
};

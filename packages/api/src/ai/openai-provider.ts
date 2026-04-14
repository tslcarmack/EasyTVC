import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import type { AIProviderInterface, GenerationResult } from './types.js';

function getBaseUrl(): string {
  return (process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
}

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured');
  return key;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', '..', 'uploads');

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 80;

async function compressImageBuffer(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const w = metadata.width || 0;
  const h = metadata.height || 0;
  const needsResize = w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION;

  let pipeline = image;
  if (needsResize) {
    pipeline = pipeline.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true });
  }

  return pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();
}

async function resolveImageToDataUri(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;

  const localMatch = imageUrl.match(/\/api\/files\/(.+)$/);
  if (localMatch) {
    const fileName = localMatch[1];
    const filePath = path.resolve(UPLOAD_DIR, fileName);

    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath);
      const compressed = await compressImageBuffer(raw);
      const base64 = compressed.toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    }
  }

  return imageUrl;
}

async function openaiRequest(reqPath: string, body: Record<string, unknown>, timeoutMs = 120_000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getBaseUrl()}${reqPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${err.error?.message || res.statusText}`);
    }

    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export class OpenAIProvider implements AIProviderInterface {
  readonly name = 'openai';

  async textToText(prompt: string, systemPrompt?: string, model?: string): Promise<GenerationResult> {
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const data = await openaiRequest('/chat/completions', {
      model: model || process.env.DEFAULT_TEXT_MODEL || 'gpt',
      messages,
      max_tokens: 4096,
    });

    return { resultText: data.choices[0].message.content };
  }

  async textToImage(
    prompt: string,
    options?: { negativePrompt?: string; width?: number; height?: number; model?: string; referenceImageUrls?: string[] },
  ): Promise<GenerationResult> {
    const model = options?.model || 'dall-e-3';
    const isDalle = model.startsWith('dall-e');

    if (isDalle) {
      const size = this.resolveImageSize(options?.width, options?.height);
      const data = await openaiRequest('/images/generations', {
        model,
        prompt,
        n: 1,
        size,
        response_format: 'url',
      });
      return { resultUrl: data.data[0].url };
    }

    // Chat-based image generation (Gemini image models, etc.)
    const contentParts: Array<Record<string, unknown>> = [];

    if (options?.referenceImageUrls?.length) {
      for (const imageUrl of options.referenceImageUrls) {
        const resolved = await resolveImageToDataUri(imageUrl);
        contentParts.push({ type: 'image_url', image_url: { url: resolved } });
      }
    }

    contentParts.push({ type: 'text', text: prompt });

    const data = await openaiRequest('/chat/completions', {
      model,
      messages: [{ role: 'user', content: contentParts.length === 1 ? prompt : contentParts }],
    });

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in response');

    // Check for inline image data in multipart response
    const parts = data.choices?.[0]?.message?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inline_data?.mime_type?.startsWith('image/')) {
          return { resultUrl: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}` };
        }
      }
    }

    // Some proxies embed base64 images in markdown: ![](data:image/...)
    const dataUriMatch = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (dataUriMatch) {
      return { resultUrl: dataUriMatch[0] };
    }

    // Some proxies return image URLs in markdown: ![](https://...)
    const urlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    if (urlMatch) {
      return { resultUrl: urlMatch[1] };
    }

    if (content.startsWith('http')) {
      return { resultUrl: content.trim() };
    }

    return { resultText: content };
  }

  async textToVideo(
    prompt: string,
    options?: { duration?: number; width?: number; height?: number; model?: string },
  ): Promise<GenerationResult> {
    const model = options?.model || 'wan2.7-t2v-720P';
    return this.videoGeneration(model, prompt, { duration: options?.duration });
  }

  async textToAudio(
    prompt: string,
    options?: { voiceId?: string; model?: string },
  ): Promise<GenerationResult> {
    const model = options?.model || 'tts-1';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);

    try {
      const res = await fetch(`${getBaseUrl()}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
          model,
          input: prompt,
          voice: options?.voiceId || 'alloy',
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`TTS error: ${(err as any).error?.message || res.statusText}`);
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('audio/') || contentType.includes('octet-stream')) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const base64 = buffer.toString('base64');
        const mime = contentType.includes('audio/') ? contentType.split(';')[0] : 'audio/mpeg';
        return { resultUrl: `data:${mime};base64,${base64}` };
      }

      const data = await res.json();
      if (data.url) return { resultUrl: data.url };
      if (data.data?.[0]?.url) return { resultUrl: data.data[0].url };

      throw new Error('TTS response did not contain audio data.');
    } finally {
      clearTimeout(timer);
    }
  }

  async imageToText(imageUrl: string, prompt?: string, model?: string): Promise<GenerationResult> {
    const resolved = await resolveImageToDataUri(imageUrl);
    const data = await openaiRequest('/chat/completions', {
      model: model || process.env.DEFAULT_TEXT_MODEL || 'gpt',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Describe this image in detail.' },
            { type: 'image_url', image_url: { url: resolved } },
          ],
        },
      ],
      max_tokens: 2048,
    });

    return { resultText: data.choices[0].message.content };
  }

  async imageToImage(
    imageUrl: string,
    prompt: string,
    options?: { strength?: number; model?: string },
  ): Promise<GenerationResult> {
    const resolved = await resolveImageToDataUri(imageUrl);
    const model = options?.model || 'gemini-3-pro-image-preview';

    const contentParts: Array<Record<string, unknown>> = [
      { type: 'image_url', image_url: { url: resolved } },
      { type: 'text', text: prompt },
    ];

    const data = await openaiRequest('/chat/completions', {
      model,
      messages: [{ role: 'user', content: contentParts }],
    });

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in response');

    const parts = data.choices?.[0]?.message?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inline_data?.mime_type?.startsWith('image/')) {
          return { resultUrl: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}` };
        }
      }
    }

    const dataUriMatch = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (dataUriMatch) return { resultUrl: dataUriMatch[0] };

    const urlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    if (urlMatch) return { resultUrl: urlMatch[1] };

    if (content.startsWith('http')) return { resultUrl: content.trim() };

    return { resultText: content };
  }

  async imageToVideo(
    imageUrl: string,
    options?: { endImageUrl?: string; prompt?: string; duration?: number; model?: string },
  ): Promise<GenerationResult> {
    const resolved = await resolveImageToDataUri(imageUrl);
    const model = options?.model || 'wan2.7-i2v-720P';

    const isKeyframe = model.includes('kf2v');

    if (isKeyframe && options?.endImageUrl) {
      const resolvedEnd = await resolveImageToDataUri(options.endImageUrl);
      return this.videoGeneration(model, options?.prompt || 'Generate a smooth transition video between these two images.', {
        duration: options?.duration,
        imageUrls: [resolved, resolvedEnd],
      });
    }

    return this.videoGeneration(model, options?.prompt || 'Animate this image into a cinematic video.', {
      duration: options?.duration,
      imageUrls: [resolved],
    });
  }

  async videoToText(videoUrl: string, prompt?: string, model?: string): Promise<GenerationResult> {
    const data = await openaiRequest('/chat/completions', {
      model: model || process.env.DEFAULT_TEXT_MODEL || 'gpt',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || 'Analyze this video. Describe the shots, editing techniques, composition, and pacing.',
            },
            { type: 'video_url', video_url: { url: videoUrl } },
          ],
        },
      ],
      max_tokens: 4096,
    });

    return { resultText: data.choices[0].message.content };
  }

  async videoToVideo(
    videoUrl: string,
    options?: { prompt?: string; duration?: number; model?: string },
  ): Promise<GenerationResult> {
    const model = options?.model || 'wan2.7-videoedit-1080P';

    const contentParts: Array<Record<string, unknown>> = [
      { type: 'video_url', video_url: { url: videoUrl } },
      { type: 'text', text: options?.prompt || 'Edit and enhance this video.' },
    ];

    const data = await openaiRequest('/chat/completions', {
      model,
      messages: [{ role: 'user', content: contentParts }],
    }, 300_000);

    const content = data.choices?.[0]?.message?.content;
    if (content?.startsWith('http')) return { resultUrl: content.trim() };

    const urlMatch = content?.match(/https?:\/\/[^\s"')]+\.(?:mp4|webm|mov)/i);
    if (urlMatch) return { resultUrl: urlMatch[0] };

    if (data.data?.[0]?.url) return { resultUrl: data.data[0].url };

    throw new Error('Video-to-video response did not contain a video URL.');
  }

  private async videoGeneration(
    model: string,
    prompt: string,
    options?: { duration?: number; imageUrls?: string[] },
  ): Promise<GenerationResult> {
    const contentParts: Array<Record<string, unknown>> = [];

    if (options?.imageUrls?.length) {
      for (const url of options.imageUrls) {
        contentParts.push({ type: 'image_url', image_url: { url } });
      }
    }

    contentParts.push({ type: 'text', text: prompt });

    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: contentParts.length === 1 ? prompt : contentParts }],
    };

    const data = await openaiRequest('/chat/completions', body, 300_000);

    const content = data.choices?.[0]?.message?.content;
    if (content?.startsWith('http')) return { resultUrl: content.trim() };

    const urlMatch = content?.match(/https?:\/\/[^\s"')]+\.(?:mp4|webm|mov)/i);
    if (urlMatch) return { resultUrl: urlMatch[0] };

    if (data.data?.[0]?.url) return { resultUrl: data.data[0].url };

    const mdUrlMatch = content?.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    if (mdUrlMatch) return { resultUrl: mdUrlMatch[1] };

    throw new Error('Video generation response did not contain a video URL.');
  }

  private resolveImageSize(width?: number, height?: number): string {
    if (width && height) {
      if (width > height) return '1792x1024';
      if (height > width) return '1024x1792';
    }
    return '1024x1024';
  }
}

import type { AIProviderInterface, GenerationResult } from './types.js';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

function getApiKey(): string {
  const key = process.env.REPLICATE_API_TOKEN;
  if (!key) throw new Error('REPLICATE_API_TOKEN not configured');
  return key;
}

async function replicateRequest(path: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${REPLICATE_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
      Prefer: 'wait',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Replicate API error: ${err.detail || res.statusText}`);
  }

  return res.json();
}

async function waitForPrediction(id: string, maxAttempts = 60): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${REPLICATE_API_URL}/predictions/${id}`, {
      headers: { Authorization: `Bearer ${getApiKey()}` },
    });
    const data = await res.json();

    if (data.status === 'succeeded') return data;
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Replicate prediction failed: ${data.error || 'Unknown error'}`);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Replicate prediction timed out');
}

export class ReplicateProvider implements AIProviderInterface {
  readonly name = 'replicate';

  async textToText(): Promise<GenerationResult> {
    throw new Error('Use OpenAI or Google for text generation. Replicate is for media generation.');
  }

  async textToAudio(): Promise<GenerationResult> {
    throw new Error('Replicate text-to-audio not yet implemented. Use mock provider for testing.');
  }

  async textToImage(
    prompt: string,
    options?: { negativePrompt?: string; width?: number; height?: number; model?: string },
  ): Promise<GenerationResult> {
    const model = options?.model || 'stability-ai/stable-diffusion-3.5-large';

    const data = await replicateRequest('/predictions', {
      model,
      input: {
        prompt,
        negative_prompt: options?.negativePrompt || '',
        width: options?.width || 1024,
        height: options?.height || 1024,
        num_outputs: 1,
      },
    });

    const result = data.status === 'succeeded' ? data : await waitForPrediction(data.id);
    const output = Array.isArray(result.output) ? result.output[0] : result.output;

    return { resultUrl: output, externalId: data.id };
  }

  async textToVideo(
    prompt: string,
    options?: { duration?: number; model?: string },
  ): Promise<GenerationResult> {
    const model = options?.model || 'minimax/video-01';

    const data = await replicateRequest('/predictions', {
      model,
      input: {
        prompt,
        ...(options?.duration ? { duration: options.duration } : {}),
      },
    });

    const result = data.status === 'succeeded' ? data : await waitForPrediction(data.id);
    const output = Array.isArray(result.output) ? result.output[0] : result.output;

    return { resultUrl: output, externalId: data.id };
  }

  async imageToText(): Promise<GenerationResult> {
    throw new Error('Use OpenAI or Google for image analysis.');
  }

  async imageToImage(
    imageUrl: string,
    prompt: string,
    options?: { strength?: number; model?: string },
  ): Promise<GenerationResult> {
    const model = options?.model || 'stability-ai/stable-diffusion-3.5-large';

    const data = await replicateRequest('/predictions', {
      model,
      input: {
        image: imageUrl,
        prompt,
        strength: options?.strength || 0.7,
        num_outputs: 1,
      },
    });

    const result = data.status === 'succeeded' ? data : await waitForPrediction(data.id);
    const output = Array.isArray(result.output) ? result.output[0] : result.output;

    return { resultUrl: output, externalId: data.id };
  }

  async imageToVideo(
    imageUrl: string,
    options?: { endImageUrl?: string; prompt?: string; duration?: number; model?: string },
  ): Promise<GenerationResult> {
    const model = options?.model || 'minimax/video-01-live';

    const input: Record<string, unknown> = {
      first_frame_image: imageUrl,
    };
    if (options?.endImageUrl) input.last_frame_image = options.endImageUrl;
    if (options?.prompt) input.prompt = options.prompt;

    const data = await replicateRequest('/predictions', {
      model,
      input,
    });

    const result = data.status === 'succeeded' ? data : await waitForPrediction(data.id);
    const output = Array.isArray(result.output) ? result.output[0] : result.output;

    return { resultUrl: output, externalId: data.id };
  }

  async videoToText(): Promise<GenerationResult> {
    throw new Error('Use OpenAI or Google for video analysis.');
  }

  async videoToVideo(
    videoUrl: string,
    options?: { prompt?: string; model?: string },
  ): Promise<GenerationResult> {
    const model = options?.model || 'minimax/video-01';

    const data = await replicateRequest('/predictions', {
      model,
      input: {
        video: videoUrl,
        ...(options?.prompt ? { prompt: options.prompt } : {}),
      },
    });

    const result = data.status === 'succeeded' ? data : await waitForPrediction(data.id);
    const output = Array.isArray(result.output) ? result.output[0] : result.output;

    return { resultUrl: output, externalId: data.id };
  }
}

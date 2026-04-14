import type { AIProviderInterface, GenerationResult } from './types.js';

const PLACEHOLDER_IMAGE = 'https://placehold.co/1024x1024/1a1a2e/6366f1?text=AI+Generated';
const PLACEHOLDER_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4';
const PLACEHOLDER_AUDIO = 'https://www.w3schools.com/html/horse.mp3';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockProvider implements AIProviderInterface {
  readonly name = 'mock';

  async textToText(prompt: string, systemPrompt?: string): Promise<GenerationResult> {
    await delay(1000);
    const sys = systemPrompt ? `[System: ${systemPrompt}]\n\n` : '';
    return {
      resultText: `${sys}Mock AI response to: "${prompt}"\n\nThis is a simulated response from the mock AI provider. In production, this would be replaced with a real language model response. The prompt you provided was ${prompt.length} characters long.`,
    };
  }

  async textToImage(
    prompt: string,
    options?: { negativePrompt?: string; width?: number; height?: number; referenceImageUrls?: string[] },
  ): Promise<GenerationResult> {
    await delay(2000);
    const w = options?.width || 1024;
    const h = options?.height || 1024;
    const encodedPrompt = encodeURIComponent(prompt.slice(0, 40));
    return {
      resultUrl: `https://placehold.co/${w}x${h}/1a1a2e/6366f1?text=${encodedPrompt}`,
    };
  }

  async textToVideo(
    prompt: string,
    options?: { duration?: number },
  ): Promise<GenerationResult> {
    await delay(3000);
    return { resultUrl: PLACEHOLDER_VIDEO };
  }

  async textToAudio(
    prompt: string,
    options?: { voiceId?: string },
  ): Promise<GenerationResult> {
    await delay(2000);
    return { resultUrl: PLACEHOLDER_AUDIO };
  }

  async imageToText(imageUrl: string, prompt?: string): Promise<GenerationResult> {
    await delay(1500);
    return {
      resultText: `Mock analysis of image at ${imageUrl}:\n\nThis image appears to contain visual content. ${prompt ? `Analysis focus: ${prompt}` : 'General description: The image shows various elements arranged in a composition.'}\n\n[Mock provider - replace with real vision model in production]`,
    };
  }

  async imageToImage(
    imageUrl: string,
    prompt: string,
    options?: { strength?: number },
  ): Promise<GenerationResult> {
    await delay(2500);
    const encodedPrompt = encodeURIComponent(prompt.slice(0, 30));
    return {
      resultUrl: `https://placehold.co/1024x1024/2e1a2e/f166c5?text=Edited:+${encodedPrompt}`,
    };
  }

  async imageToVideo(
    imageUrl: string,
    options?: { endImageUrl?: string; prompt?: string; duration?: number },
  ): Promise<GenerationResult> {
    await delay(3000);
    return { resultUrl: PLACEHOLDER_VIDEO };
  }

  async videoToText(videoUrl: string, prompt?: string): Promise<GenerationResult> {
    await delay(2000);
    return {
      resultText: `Mock analysis of video at ${videoUrl}:\n\nShot breakdown:\n1. Opening shot - wide angle establishing shot\n2. Medium close-up with subject movement\n3. Cut to detail shot with shallow depth of field\n\nEditing techniques: Jump cuts, match cuts, smooth transitions.\n${prompt ? `\nFocused analysis: ${prompt}` : ''}\n\n[Mock provider - replace with real video analysis model in production]`,
    };
  }

  async videoToVideo(
    videoUrl: string,
    options?: { prompt?: string; duration?: number },
  ): Promise<GenerationResult> {
    await delay(3000);
    return { resultUrl: PLACEHOLDER_VIDEO };
  }
}

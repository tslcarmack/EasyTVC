export interface GenerationResult {
  resultUrl?: string;
  resultText?: string;
  externalId?: string;
}

export interface AIProviderInterface {
  readonly name: string;

  textToText(prompt: string, systemPrompt?: string, model?: string): Promise<GenerationResult>;

  textToImage(
    prompt: string,
    options?: { negativePrompt?: string; width?: number; height?: number; model?: string; referenceImageUrls?: string[] },
  ): Promise<GenerationResult>;

  textToVideo(
    prompt: string,
    options?: { duration?: number; width?: number; height?: number; model?: string },
  ): Promise<GenerationResult>;

  textToAudio(
    prompt: string,
    options?: { voiceId?: string; model?: string },
  ): Promise<GenerationResult>;

  imageToText(imageUrl: string, prompt?: string, model?: string): Promise<GenerationResult>;

  imageToImage(
    imageUrl: string,
    prompt: string,
    options?: { strength?: number; model?: string },
  ): Promise<GenerationResult>;

  imageToVideo(
    imageUrl: string,
    options?: { endImageUrl?: string; prompt?: string; duration?: number; model?: string },
  ): Promise<GenerationResult>;

  videoToText(videoUrl: string, prompt?: string, model?: string): Promise<GenerationResult>;

  videoToVideo(
    videoUrl: string,
    options?: { prompt?: string; duration?: number; model?: string },
  ): Promise<GenerationResult>;
}

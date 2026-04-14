export interface CharacterContext {
  name: string;
  description: string;
  referenceImages: string[];
}

export interface StyleContext {
  description: string;
  keywords: string[];
  referenceImages: string[];
}

export interface SceneContext {
  sceneDescription: string;
  characters: CharacterContext[];
  style: StyleContext | null;
  shotType?: string;
}

const SHOT_TYPE_MAP: Record<string, string> = {
  'close-up': 'Close-up shot, face fills the frame',
  'medium': 'Medium shot, waist-up framing',
  'wide': 'Wide shot, full body with environment visible',
  'aerial': 'Aerial/bird\'s eye view shot',
  'over-shoulder': 'Over-the-shoulder shot',
  'low-angle': 'Low angle shot, looking up',
  'high-angle': 'High angle shot, looking down',
};

export function buildCompositePrompt(context: SceneContext): {
  prompt: string;
  referenceImageUrls: string[];
} {
  const parts: string[] = [];
  const allRefImages: string[] = [];

  if (context.style) {
    const styleKeywords = context.style.keywords.length > 0
      ? context.style.keywords.join(', ')
      : '';
    const styleLine = [
      'Style:',
      context.style.description,
      styleKeywords ? `(${styleKeywords})` : '',
    ].filter(Boolean).join(' ');
    parts.push(styleLine);

    allRefImages.push(...context.style.referenceImages);
  }

  parts.push(`Scene: ${context.sceneDescription}`);

  for (const char of context.characters) {
    if (char.description) {
      parts.push(`Character "${char.name}": ${char.description}`);
    }
    allRefImages.push(...char.referenceImages);
  }

  if (context.shotType) {
    const shotDesc = SHOT_TYPE_MAP[context.shotType] || context.shotType;
    parts.push(`Composition: ${shotDesc}`);
  }

  return {
    prompt: parts.join('\n\n'),
    referenceImageUrls: allRefImages,
  };
}

export function buildVoiceoverScript(
  scenes: Array<{ title: string; description: string; duration: number }>,
): string {
  return scenes.map((s, i) => `[Scene ${i + 1}: ${s.title}] ${s.description}`).join('\n');
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, getUserFromRequest } from '../middleware/auth.js';
import { getProvider, getDefaultProvider } from '../ai/index.js';
import { buildCompositePrompt, type CharacterContext, type StyleContext } from '../ai/prompt-builder.js';

const textToTextSchema = z.object({
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
});

const textToImageSchema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  nodeId: z.string().optional(),
  referenceImageUrls: z.array(z.string()).optional(),
});

const textToVideoSchema = z.object({
  prompt: z.string().min(1),
  duration: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  nodeId: z.string().optional(),
});

const textToAudioSchema = z.object({
  prompt: z.string().min(1),
  voiceId: z.string().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  nodeId: z.string().optional(),
});

const imageToTextSchema = z.object({
  imageUrl: z.string().min(1),
  prompt: z.string().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
});

const imageToImageSchema = z.object({
  imageUrl: z.string().min(1),
  prompt: z.string().min(1),
  strength: z.number().min(0).max(1).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  nodeId: z.string().optional(),
});

const imageToVideoSchema = z.object({
  imageUrl: z.string().min(1),
  endImageUrl: z.string().optional(),
  prompt: z.string().optional(),
  duration: z.number().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  nodeId: z.string().optional(),
});

const videoToTextSchema = z.object({
  videoUrl: z.string().min(1),
  prompt: z.string().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
});

const videoToVideoSchema = z.object({
  videoUrl: z.string().min(1),
  prompt: z.string().optional(),
  duration: z.number().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  nodeId: z.string().optional(),
});

const parseStoryboardSchema = z.object({
  script: z.string().min(1),
  model: z.string().optional(),
  provider: z.string().optional(),
  sceneCount: z.number().min(1).max(20).optional(),
  characterNames: z.array(z.string()).optional(),
});

const pipelineImageSchema = z.object({
  prompt: z.string().min(1),
  referenceImageUrls: z.array(z.string()).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  nodeId: z.string().optional(),
});

function resolveProvider(providerName?: string) {
  return providerName ? getProvider(providerName) : getDefaultProvider();
}

function splitScriptIntoParagraphScenes(
  script: string,
  targetCount: number,
): Array<{ title: string; description: string; duration: number; characters?: string[]; shotType?: string }> {
  const paragraphs = script
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return [];

  const merged: string[] = [];
  if (paragraphs.length <= targetCount) {
    merged.push(...paragraphs);
  } else {
    const chunkSize = Math.ceil(paragraphs.length / targetCount);
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      merged.push(paragraphs.slice(i, i + chunkSize).join(' '));
    }
  }

  return merged.map((text, i) => {
    const firstLine = text.split(/[。！？\n]/)[0].trim();
    const title = firstLine.length > 8 ? firstLine.slice(0, 8) : firstLine || `场景${i + 1}`;
    return {
      title,
      description: text.replace(/\n/g, ' ').trim(),
      duration: Math.max(3, Math.min(8, Math.round(text.length / 30))),
      characters: [],
      shotType: i === 0 ? 'wide' : i === merged.length - 1 ? 'wide' : 'medium',
    };
  });
}

function parseChineseStoryboard(text: string): Array<{ title: string; description: string; duration: number }> {
  const scenes: Array<{ title: string; description: string; duration: number }> = [];

  // Match patterns like: **画面1  标题**（0-4秒） or 【画面1】标题 or ## 画面1：标题
  const sectionPattern = /(?:\*{0,2}画面\s*\d+[^*\n]*\*{0,2}|【[^】]*】|#{1,3}\s*(?:画面|场景|镜头)\s*\d+[^\n]*)/g;
  const sections = text.split(sectionPattern).slice(1);
  const headers = text.match(sectionPattern);

  if (!headers || headers.length === 0) return scenes;

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].replace(/\*+/g, '').replace(/[【】#]/g, '').trim();

    // Extract title from header
    const titleMatch = header.match(/画面\s*\d+\s*(.+?)(?:（|$)/);
    const title = titleMatch ? titleMatch[1].trim() : header.replace(/画面\s*\d+\s*/, '').replace(/（.*）/, '').trim() || `Scene ${i + 1}`;

    // Extract duration from header: （0-4秒） or (5s)
    const durMatch = header.match(/(\d+)\s*[-~]\s*(\d+)\s*秒/);
    const duration = durMatch ? Math.round((parseInt(durMatch[1]) + parseInt(durMatch[2])) / 2) : 4;

    // Use the section body as description
    const body = (sections[i] || '').replace(/---/g, '').replace(/\n{2,}/g, '\n').trim();
    const descLines = body.split('\n').filter(l => l.trim() && !l.startsWith('字幕') && !l.startsWith('音效') && !l.startsWith('音乐') && !l.startsWith('旁白'));
    const description = descLines.slice(0, 3).join(' ').replace(/\s+/g, ' ').trim() || title;

    if (title) {
      scenes.push({ title, description, duration });
    }
  }

  return scenes;
}

export async function generationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // Parse storyboard from script text
  app.post('/parse-storyboard', async (request, reply) => {
    const parsed = parseStoryboardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const { script, model, provider: providerName, sceneCount, characterNames } = parsed.data;
    const provider = resolveProvider(providerName);

    const charListHint = characterNames && characterNames.length > 0
      ? `\n已知角色列表: ${characterNames.join(', ')}。请在每个场景的 "characters" 字段中标注该场景出现了哪些角色。`
      : '';

    const targetCount = sceneCount || 6;

    const systemPrompt = `You are a professional TVC storyboard analyst. You MUST output ONLY a JSON array. No other text, no explanation, no markdown.

Task: Analyze the script below and split it into exactly ${targetCount} visual scenes.${charListHint}

Output format - a JSON array where each element has:
- "title": short scene title in Chinese (2-5 chars)
- "description": detailed visual description for AI image generation (in English, 1-2 sentences, describe composition, characters, lighting, mood)
- "duration": estimated duration in seconds (2-10)
- "characters": array of character names appearing in this scene (empty array if none)
- "shotType": one of "close-up", "medium", "wide", "aerial", "over-shoulder", "low-angle", "high-angle"

Example: [{"title":"清晨开店","description":"Close-up of hands unlocking a cafe door at dawn, warm golden light, condensation on glass","duration":3,"characters":[],"shotType":"close-up"}]

CRITICAL: Your response must start with [ and end with ]. Nothing else.`;

    const userPrompt = `<script>\n${script}\n</script>\n\nAnalyze the script above and return ONLY a JSON array of ${targetCount} scenes. Start with [ immediately.`;

    try {
      const result = await provider.textToText(userPrompt, systemPrompt, model);
      const text = result.resultText || '';

      let scenes: Array<{ title: string; description: string; duration: number; characters?: string[]; shotType?: string }>;

      // Try 1: parse as JSON
      try {
        let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        scenes = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
        if (!Array.isArray(scenes)) throw new Error('Not an array');
      } catch {
        // Try 2: fallback - extract scenes from structured Chinese text
        scenes = parseChineseStoryboard(text);

        // Try 3: if still no scenes, split the original script into paragraphs as scenes
        if (scenes.length === 0) {
          scenes = splitScriptIntoParagraphScenes(script, targetCount);
        }

        if (scenes.length === 0) {
          request.log.warn({ raw: text }, 'storyboard: failed to parse AI response');
          return reply.status(422).send({ success: false, error: 'AI返回格式异常，请重试', raw: text });
        }
      }

      scenes = scenes.map((s) => ({
        title: s.title || '',
        description: s.description || '',
        duration: s.duration || 4,
        characters: Array.isArray(s.characters) ? s.characters : [],
        shotType: s.shotType || 'medium',
      }));

      return reply.send({ success: true, data: { scenes } });
    } catch (err: any) {
      request.log.error({ err }, 'storyboard parsing failed');
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Pipeline: generate a single storyboard image with composite prompt
  app.post('/pipeline/generate-image', async (request, reply) => {
    const parsed = pipelineImageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const user = getUserFromRequest(request);
    const { prompt, referenceImageUrls, width, height, model, provider: providerName, nodeId } = parsed.data;
    const provider = resolveProvider(providerName);

    const task = await prisma.generationTask.create({
      data: {
        userId: user.id,
        type: 'text_to_image',
        provider: provider.name,
        model: model || 'default',
        prompt,
        nodeId,
        config: { width, height, referenceImageUrls, pipeline: true } as any,
        status: 'processing',
      },
    });

    try {
      const result = await provider.textToImage(prompt, {
        width, height, model, referenceImageUrls,
      });

      const updated = await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          resultUrl: result.resultUrl,
          progress: 100,
          externalId: result.externalId,
        },
      });

      return reply.send({ success: true, data: formatTask(updated) });
    } catch (err: any) {
      request.log.error({ err, taskId: task.id }, 'pipeline image generation failed');
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'failed', error: err.message },
      });
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Pipeline: build composite prompt from scene context
  app.post('/pipeline/build-prompt', async (request, reply) => {
    const body = request.body as any;
    try {
      const result = buildCompositePrompt({
        sceneDescription: body.sceneDescription || '',
        characters: (body.characters || []) as CharacterContext[],
        style: body.style || null,
        shotType: body.shotType,
      });
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  // Text-to-Text
  app.post('/text-to-text', async (request, reply) => {
    const parsed = textToTextSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const user = getUserFromRequest(request);
    const { prompt, systemPrompt, model, provider: providerName } = parsed.data;
    const provider = resolveProvider(providerName);

    const task = await prisma.generationTask.create({
      data: {
        userId: user.id,
        type: 'text_to_text',
        provider: provider.name,
        model: model || 'default',
        prompt,
        config: { systemPrompt } as Prisma.InputJsonValue,
        status: 'processing',
      },
    });

    try {
      const result = await provider.textToText(prompt, systemPrompt, model);

      const updated = await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          resultText: result.resultText,
          progress: 100,
          externalId: result.externalId,
        },
      });

      return reply.send({ success: true, data: formatTask(updated) });
    } catch (err: any) {
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'failed', error: err.message },
      });
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Text-to-Image
  app.post('/text-to-image', async (request, reply) => {
    const parsed = textToImageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const user = getUserFromRequest(request);
    const { prompt, negativePrompt, width, height, model, provider: providerName, nodeId, referenceImageUrls } = parsed.data;
    const provider = resolveProvider(providerName);

    const task = await prisma.generationTask.create({
      data: {
        userId: user.id,
        type: 'text_to_image',
        provider: provider.name,
        model: model || 'default',
        prompt,
        nodeId,
        config: { negativePrompt, width, height, referenceImageUrls } as Prisma.InputJsonValue,
        status: 'processing',
      },
    });

    try {
      const result = await provider.textToImage(prompt, { negativePrompt, width, height, model, referenceImageUrls });

      const updated = await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          resultUrl: result.resultUrl,
          progress: 100,
          externalId: result.externalId,
        },
      });

      return reply.send({ success: true, data: formatTask(updated) });
    } catch (err: any) {
      request.log.error({ err, taskId: task.id }, 'text-to-image generation failed');
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'failed', error: err.message },
      });
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Text-to-Video
  app.post('/text-to-video', async (request, reply) => {
    const parsed = textToVideoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const user = getUserFromRequest(request);
    const { prompt, duration, width, height, model, provider: providerName, nodeId } = parsed.data;
    const provider = resolveProvider(providerName);

    const task = await prisma.generationTask.create({
      data: {
        userId: user.id,
        type: 'text_to_video',
        provider: provider.name,
        model: model || 'default',
        prompt,
        nodeId,
        config: { duration, width, height } as Prisma.InputJsonValue,
        status: 'processing',
      },
    });

    try {
      const result = await provider.textToVideo(prompt, { duration, width, height, model });

      const updated = await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          resultUrl: result.resultUrl,
          progress: 100,
          externalId: result.externalId,
        },
      });

      return reply.send({ success: true, data: formatTask(updated) });
    } catch (err: any) {
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'failed', error: err.message },
      });
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Text-to-Audio
  app.post('/text-to-audio', async (request, reply) => {
    const parsed = textToAudioSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const user = getUserFromRequest(request);
    const { prompt, voiceId, model, provider: providerName, nodeId } = parsed.data;
    const provider = resolveProvider(providerName);

    const task = await prisma.generationTask.create({
      data: {
        userId: user.id,
        type: 'text_to_audio',
        provider: provider.name,
        model: model || 'default',
        prompt,
        nodeId,
        config: { voiceId } as Prisma.InputJsonValue,
        status: 'processing',
      },
    });

    try {
      const result = await provider.textToAudio(prompt, { voiceId, model });

      const updated = await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          resultUrl: result.resultUrl,
          progress: 100,
          externalId: result.externalId,
        },
      });

      return reply.send({ success: true, data: formatTask(updated) });
    } catch (err: any) {
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'failed', error: err.message },
      });
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Image-to-Text
  app.post('/image-to-text', async (request, reply) => {
    const parsed = imageToTextSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const user = getUserFromRequest(request);
    const { imageUrl, prompt, model, provider: providerName } = parsed.data;
    const provider = resolveProvider(providerName);

    const task = await prisma.generationTask.create({
      data: {
        userId: user.id,
        type: 'image_to_text',
        provider: provider.name,
        model: model || 'default',
        prompt,
        inputFileUrl: imageUrl,
        status: 'processing',
      },
    });

    try {
      const result = await provider.imageToText(imageUrl, prompt, model);

      const updated = await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          resultText: result.resultText,
          progress: 100,
          externalId: result.externalId,
        },
      });

      return reply.send({ success: true, data: formatTask(updated) });
    } catch (err: any) {
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'failed', error: err.message },
      });
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Image-to-Image
  app.post('/image-to-image', async (request, reply) => {
    const parsed = imageToImageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const user = getUserFromRequest(request);
    const { imageUrl, prompt, strength, model, provider: providerName, nodeId } = parsed.data;
    const provider = resolveProvider(providerName);

    const task = await prisma.generationTask.create({
      data: {
        userId: user.id,
        type: 'image_to_image',
        provider: provider.name,
        model: model || 'default',
        prompt,
        nodeId,
        inputFileUrl: imageUrl,
        config: { strength } as Prisma.InputJsonValue,
        status: 'processing',
      },
    });

    try {
      const result = await provider.imageToImage(imageUrl, prompt, { strength, model });

      const updated = await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          resultUrl: result.resultUrl,
          progress: 100,
          externalId: result.externalId,
        },
      });

      return reply.send({ success: true, data: formatTask(updated) });
    } catch (err: any) {
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'failed', error: err.message },
      });
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Image-to-Video
  app.post('/image-to-video', async (request, reply) => {
    const parsed = imageToVideoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const user = getUserFromRequest(request);
    const { imageUrl, endImageUrl, prompt, duration, model, provider: providerName, nodeId } = parsed.data;
    const provider = resolveProvider(providerName);

    const task = await prisma.generationTask.create({
      data: {
        userId: user.id,
        type: 'image_to_video',
        provider: provider.name,
        model: model || 'default',
        prompt,
        nodeId,
        inputFileUrl: imageUrl,
        inputFileUrl2: endImageUrl,
        config: { duration } as Prisma.InputJsonValue,
        status: 'processing',
      },
    });

    try {
      const result = await provider.imageToVideo(imageUrl, { endImageUrl, prompt, duration, model });

      const updated = await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          resultUrl: result.resultUrl,
          progress: 100,
          externalId: result.externalId,
        },
      });

      return reply.send({ success: true, data: formatTask(updated) });
    } catch (err: any) {
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'failed', error: err.message },
      });
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Video-to-Text
  app.post('/video-to-text', async (request, reply) => {
    const parsed = videoToTextSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const user = getUserFromRequest(request);
    const { videoUrl, prompt, model, provider: providerName } = parsed.data;
    const provider = resolveProvider(providerName);

    const task = await prisma.generationTask.create({
      data: {
        userId: user.id,
        type: 'video_to_text',
        provider: provider.name,
        model: model || 'default',
        prompt,
        inputFileUrl: videoUrl,
        status: 'processing',
      },
    });

    try {
      const result = await provider.videoToText(videoUrl, prompt, model);

      const updated = await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          resultText: result.resultText,
          progress: 100,
          externalId: result.externalId,
        },
      });

      return reply.send({ success: true, data: formatTask(updated) });
    } catch (err: any) {
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'failed', error: err.message },
      });
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Video-to-Video (extend)
  app.post('/video-to-video', async (request, reply) => {
    const parsed = videoToVideoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0].message });
    }

    const user = getUserFromRequest(request);
    const { videoUrl, prompt, duration, model, provider: providerName, nodeId } = parsed.data;
    const provider = resolveProvider(providerName);

    const task = await prisma.generationTask.create({
      data: {
        userId: user.id,
        type: 'video_to_video',
        provider: provider.name,
        model: model || 'default',
        prompt,
        nodeId,
        inputFileUrl: videoUrl,
        config: { duration } as Prisma.InputJsonValue,
        status: 'processing',
      },
    });

    try {
      const result = await provider.videoToVideo(videoUrl, { prompt, duration, model });

      const updated = await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          resultUrl: result.resultUrl,
          progress: 100,
          externalId: result.externalId,
        },
      });

      return reply.send({ success: true, data: formatTask(updated) });
    } catch (err: any) {
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'failed', error: err.message },
      });
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Task status
  app.get<{ Params: { taskId: string } }>('/tasks/:taskId', async (request, reply) => {
    const task = await prisma.generationTask.findFirst({
      where: { id: request.params.taskId, userId: getUserFromRequest(request).id },
    });

    if (!task) {
      return reply.status(404).send({ success: false, error: 'Task not found' });
    }

    return reply.send({ success: true, data: formatTask(task) });
  });

  // List tasks for current user
  app.get('/tasks', async (request, reply) => {
    const { projectId, status, limit } = request.query as {
      projectId?: string;
      status?: string;
      limit?: string;
    };

    const where: any = { userId: getUserFromRequest(request).id };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const tasks = await prisma.generationTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    });

    return reply.send({
      success: true,
      data: tasks.map(formatTask),
    });
  });

  // Available models
  app.get('/models', async (_request, reply) => {
    const { AVAILABLE_MODELS } = await import('@easytvc/shared');
    return reply.send({ success: true, data: AVAILABLE_MODELS });
  });
}

function formatTask(task: any) {
  return {
    id: task.id,
    type: task.type,
    status: task.status,
    provider: task.provider,
    model: task.model,
    prompt: task.prompt,
    inputFileUrl: task.inputFileUrl,
    inputFileUrl2: task.inputFileUrl2,
    resultUrl: task.resultUrl,
    resultText: task.resultText,
    error: task.error,
    progress: task.progress,
    nodeId: task.nodeId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

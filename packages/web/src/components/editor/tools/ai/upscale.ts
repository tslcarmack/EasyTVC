import { Maximize } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const tool: EditorToolPlugin = {
  id: 'ai-upscale',
  name: 'AI 超分',
  icon: Maximize,
  category: 'ai',
  hint: 'AI 提升图片分辨率和清晰度',

  defaultParams: { factor: '2x', enhanceType: 'general' },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('p', { className: 'text-[10px] text-[var(--color-text-secondary)] leading-relaxed' },
        'AI 将提升图片分辨率并增强细节。',
      ),
      createElement('div', { className: 'space-y-1' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '放大倍数'),
        createElement('div', { className: 'flex gap-2' },
          ...['2x', '4x'].map((f) =>
            createElement('button', {
              key: f,
              onClick: () => onChange('factor', f),
              className: `flex-1 rounded-lg border py-2 text-xs transition ${
                params.factor === f
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
              }`,
            }, f),
          ),
        ),
      ),
      createElement('div', { className: 'space-y-1' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '增强类型'),
        createElement('div', { className: 'flex gap-1' },
          ...([
            { label: '通用', value: 'general' },
            { label: '人脸', value: 'face' },
            { label: '风景', value: 'landscape' },
          ] as const).map((t) =>
            createElement('button', {
              key: t.value,
              onClick: () => onChange('enhanceType', t.value),
              className: `flex-1 rounded px-2 py-1 text-[10px] transition ${
                params.enhanceType === t.value
                  ? 'bg-[var(--color-primary)]/20 text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
              }`,
            }, t.label),
          ),
        ),
      ),
    );
  },

  buildAIRequest(context) {
    const factor = context.params.factor || '2x';
    const type = context.params.enhanceType || 'general';
    const scale = factor === '4x' ? 4 : 2;
    return {
      prompt: `Enhance this image: increase resolution to ${factor}, improve sharpness, add fine details. Focus on ${type}. ${context.params.prompt || ''}`.trim(),
      referenceImageUrls: [context.currentImageDataUrl],
      width: context.canvasWidth * scale,
      height: context.canvasHeight * scale,
    };
  },
};

registerTool(tool);

import { ImagePlus } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const tool: EditorToolPlugin = {
  id: 'ai-bg-replace',
  name: '背景替换',
  icon: ImagePlus,
  category: 'ai',
  hint: '保留主体，用 AI 替换背景为你描述的场景',

  defaultParams: { backgroundDescription: '' },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-2' },
      createElement('p', { className: 'text-[10px] text-[var(--color-text-secondary)] leading-relaxed' },
        '保留主体，AI 将背景替换为你描述的场景。在下方 AI 生成中输入背景描述。',
      ),
      createElement('div', { className: 'space-y-1' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '背景描述'),
        createElement('input', {
          type: 'text',
          value: params.backgroundDescription || '',
          onChange: (e: any) => onChange('backgroundDescription', e.target.value),
          placeholder: '例如：日落海滩、雪山、未来城市...',
          className: 'w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[11px] text-white placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none',
        }),
      ),
    );
  },

  buildAIRequest(context) {
    const bgDesc = context.params.backgroundDescription || context.params.prompt || 'a beautiful natural scene';
    return {
      prompt: `Keep the main subject, replace the background with: ${bgDesc}`,
      referenceImageUrls: [context.currentImageDataUrl],
      width: context.canvasWidth,
      height: context.canvasHeight,
    };
  },
};

registerTool(tool);

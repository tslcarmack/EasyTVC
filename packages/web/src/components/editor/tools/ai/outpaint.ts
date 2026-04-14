import { Expand } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

function sliderRow(label: string, key: string, min: number, max: number, params: Record<string, any>, onChange: (k: string, v: any) => void) {
  return createElement('div', { className: 'space-y-1' },
    createElement('div', { className: 'flex justify-between' },
      createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, label),
      createElement('span', { className: 'text-[10px] text-white' }, `${params[key] ?? 0}px`),
    ),
    createElement('input', {
      type: 'range', min, max,
      value: params[key] ?? 0,
      onChange: (e: any) => onChange(key, parseInt(e.target.value)),
      className: 'w-full accent-[var(--color-primary)]',
    }),
  );
}

const tool: EditorToolPlugin = {
  id: 'ai-outpaint',
  name: '智能扩图',
  icon: Expand,
  category: 'ai',
  hint: '向四个方向扩展图片内容，AI 自动补全',

  defaultParams: { expandTop: 0, expandRight: 0, expandBottom: 0, expandLeft: 0 },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('p', { className: 'text-[10px] text-[var(--color-text-secondary)] leading-relaxed' },
        '设置四个方向的扩展像素，AI 将自动生成无缝衔接的内容。',
      ),
      sliderRow('上', 'expandTop', 0, 512, params, onChange),
      sliderRow('右', 'expandRight', 0, 512, params, onChange),
      sliderRow('下', 'expandBottom', 0, 512, params, onChange),
      sliderRow('左', 'expandLeft', 0, 512, params, onChange),
    );
  },

  buildAIRequest(context) {
    const { expandTop = 0, expandRight = 0, expandBottom = 0, expandLeft = 0 } = context.params;
    const newW = context.canvasWidth + expandLeft + expandRight;
    const newH = context.canvasHeight + expandTop + expandBottom;

    return {
      prompt: `Extend this image naturally. The gray border areas need to be filled with content that seamlessly continues the existing image. Expand: top=${expandTop}px, right=${expandRight}px, bottom=${expandBottom}px, left=${expandLeft}px. ${context.params.prompt || ''}`.trim(),
      referenceImageUrls: [context.currentImageDataUrl],
      width: newW,
      height: newH,
    };
  },
};

registerTool(tool);

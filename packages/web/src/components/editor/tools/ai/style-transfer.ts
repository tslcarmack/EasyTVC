import { Wand2 } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const STYLES = [
  { name: '油画', en: 'Oil Painting' },
  { name: '水彩', en: 'Watercolor' },
  { name: '动漫', en: 'Anime' },
  { name: '像素', en: 'Pixel Art' },
  { name: '铅笔素描', en: 'Pencil Sketch' },
  { name: '波普艺术', en: 'Pop Art' },
  { name: '印象派', en: 'Impressionist' },
  { name: '浮世绘', en: 'Ukiyo-e' },
  { name: '3D 渲染', en: '3D Render' },
  { name: '赛博朋克', en: 'Cyberpunk' },
];

const tool: EditorToolPlugin = {
  id: 'ai-style-transfer',
  name: '风格迁移',
  icon: Wand2,
  category: 'ai',
  hint: '将图片转换为不同的艺术风格',

  defaultParams: { style: '' },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('p', { className: 'text-[10px] text-[var(--color-text-secondary)] leading-relaxed' },
        '选择目标风格，AI 将保留构图和主体并转换画风。',
      ),
      createElement('div', { className: 'grid grid-cols-2 gap-1.5' },
        ...STYLES.map((s) =>
          createElement('button', {
            key: s.name,
            onClick: () => onChange('style', s.en),
            className: `rounded-lg border px-2 py-2 text-[10px] transition ${
              params.style === s.en
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-white'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
            }`,
          }, s.name),
        ),
      ),
    );
  },

  buildAIRequest(context) {
    const style = context.params.style || 'Oil Painting';
    return {
      prompt: `Transform this image into ${style} style while preserving the composition and subject. ${context.params.prompt || ''}`.trim(),
      referenceImageUrls: [context.currentImageDataUrl],
      width: context.canvasWidth,
      height: context.canvasHeight,
    };
  },
};

registerTool(tool);

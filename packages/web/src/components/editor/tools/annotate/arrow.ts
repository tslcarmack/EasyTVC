import { ArrowUpRight } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const COLORS = ['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#000000'];

const tool: EditorToolPlugin = {
  id: 'arrow',
  name: '箭头',
  icon: ArrowUpRight,
  category: 'annotate',
  hint: '绘制箭头标注',

  defaultParams: {
    color: '#ff0000',
    lineWidth: 3,
    _arrows: [] as Array<{ x1: number; y1: number; x2: number; y2: number; color: string; lineWidth: number }>,
  },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('div', { className: 'space-y-1' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '颜色'),
        createElement('div', { className: 'flex flex-wrap gap-1' },
          ...COLORS.map((c) =>
            createElement('button', {
              key: c,
              onClick: () => onChange('color', c),
              className: `h-5 w-5 rounded-full border-2 transition ${
                params.color === c ? 'border-white scale-110' : 'border-transparent'
              }`,
              style: { backgroundColor: c },
            }),
          ),
        ),
      ),
      createElement('div', { className: 'space-y-1' },
        createElement('div', { className: 'flex justify-between' },
          createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '线宽'),
          createElement('span', { className: 'text-[10px] text-white' }, params.lineWidth ?? 3),
        ),
        createElement('input', {
          type: 'range', min: 1, max: 8,
          value: params.lineWidth ?? 3,
          onChange: (e: any) => onChange('lineWidth', parseInt(e.target.value)),
          className: 'w-full accent-[var(--color-primary)]',
        }),
      ),
    );
  },

  applyCanvas(imageData, params) {
    const arrows = params._arrows;
    if (!arrows || arrows.length === 0) return imageData;

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    for (const a of arrows) {
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.lineWidth = a.lineWidth;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(a.x2, a.y2);
      ctx.stroke();

      const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
      const headLen = a.lineWidth * 4;
      ctx.beginPath();
      ctx.moveTo(a.x2, a.y2);
      ctx.lineTo(
        a.x2 - headLen * Math.cos(angle - Math.PI / 6),
        a.y2 - headLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        a.x2 - headLen * Math.cos(angle + Math.PI / 6),
        a.y2 - headLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  },
};

registerTool(tool);

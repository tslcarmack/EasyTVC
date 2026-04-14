import { Square } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const COLORS = ['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#000000'];

const tool: EditorToolPlugin = {
  id: 'rect-ellipse',
  name: '矩形/椭圆',
  icon: Square,
  category: 'annotate',
  hint: '绘制矩形或椭圆形状',

  defaultParams: {
    shape: 'rect',
    color: '#ff0000',
    lineWidth: 2,
    filled: false,
    _shapes: [] as Array<{ shape: string; x: number; y: number; w: number; h: number; color: string; lineWidth: number; filled: boolean }>,
  },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('div', { className: 'flex gap-2' },
        createElement('button', {
          onClick: () => onChange('shape', 'rect'),
          className: `flex-1 rounded-lg border py-1.5 text-[10px] transition ${
            params.shape === 'rect'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
          }`,
        }, '矩形'),
        createElement('button', {
          onClick: () => onChange('shape', 'ellipse'),
          className: `flex-1 rounded-lg border py-1.5 text-[10px] transition ${
            params.shape === 'ellipse'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
          }`,
        }, '椭圆'),
      ),
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
          createElement('span', { className: 'text-[10px] text-white' }, params.lineWidth ?? 2),
        ),
        createElement('input', {
          type: 'range', min: 1, max: 10,
          value: params.lineWidth ?? 2,
          onChange: (e: any) => onChange('lineWidth', parseInt(e.target.value)),
          className: 'w-full accent-[var(--color-primary)]',
        }),
      ),
      createElement('label', { className: 'flex items-center gap-2 cursor-pointer' },
        createElement('input', {
          type: 'checkbox',
          checked: params.filled ?? false,
          onChange: (e: any) => onChange('filled', e.target.checked),
          className: 'accent-[var(--color-primary)]',
        }),
        createElement('span', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '填充'),
      ),
    );
  },

  applyCanvas(imageData, params) {
    const shapes = params._shapes;
    if (!shapes || shapes.length === 0) return imageData;

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    for (const s of shapes) {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.lineWidth;

      if (s.shape === 'rect') {
        if (s.filled) ctx.fillRect(s.x, s.y, s.w, s.h);
        else ctx.strokeRect(s.x, s.y, s.w, s.h);
      } else {
        ctx.beginPath();
        ctx.ellipse(
          s.x + s.w / 2,
          s.y + s.h / 2,
          Math.abs(s.w / 2),
          Math.abs(s.h / 2),
          0, 0, Math.PI * 2,
        );
        if (s.filled) ctx.fill();
        else ctx.stroke();
      }
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  },
};

registerTool(tool);

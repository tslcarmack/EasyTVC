import { Pen } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

function sliderRow(label: string, key: string, min: number, max: number, params: Record<string, any>, onChange: (k: string, v: any) => void) {
  return createElement('div', { className: 'space-y-1' },
    createElement('div', { className: 'flex justify-between' },
      createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, label),
      createElement('span', { className: 'text-[10px] text-white' }, params[key] ?? 0),
    ),
    createElement('input', {
      type: 'range', min, max,
      value: params[key] ?? 0,
      onChange: (e: any) => onChange(key, parseInt(e.target.value)),
      className: 'w-full accent-[var(--color-primary)]',
    }),
  );
}

const COLORS = ['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#000000'];

const tool: EditorToolPlugin = {
  id: 'brush',
  name: '画笔',
  icon: Pen,
  category: 'annotate',
  shortcut: 'B',
  hint: '在图片上自由绘画，选择颜色和大小',

  defaultParams: {
    color: '#ff0000',
    size: 5,
    opacity: 100,
    _strokes: [] as Array<{ points: Array<{ x: number; y: number }>; color: string; size: number; opacity: number }>,
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
          createElement('input', {
            type: 'color',
            value: params.color || '#ff0000',
            onChange: (e: any) => onChange('color', e.target.value),
            className: 'h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent',
          }),
        ),
      ),
      sliderRow('大小', 'size', 1, 50, params, onChange),
      sliderRow('不透明度', 'opacity', 1, 100, params, onChange),
    );
  },

  applyCanvas(imageData, params) {
    const strokes = params._strokes;
    if (!strokes || strokes.length === 0) return imageData;

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.globalAlpha = (stroke.opacity ?? 100) / 100;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  },
};

registerTool(tool);

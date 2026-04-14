import { Type } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const COLORS = ['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#000000'];

const tool: EditorToolPlugin = {
  id: 'text',
  name: '文字',
  icon: Type,
  category: 'annotate',
  shortcut: 'T',
  hint: '点击画布添加文字标注',

  defaultParams: {
    text: '',
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'normal',
    _texts: [] as Array<{ x: number; y: number; text: string; fontSize: number; color: string; fontWeight: string }>,
  },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('div', { className: 'space-y-1' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '文字内容'),
        createElement('input', {
          type: 'text',
          value: params.text || '',
          onChange: (e: any) => onChange('text', e.target.value),
          placeholder: '输入文字...',
          className: 'w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[11px] text-white placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none',
        }),
      ),
      createElement('div', { className: 'space-y-1' },
        createElement('div', { className: 'flex justify-between' },
          createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' }, '字号'),
          createElement('span', { className: 'text-[10px] text-white' }, params.fontSize ?? 24),
        ),
        createElement('input', {
          type: 'range', min: 12, max: 72,
          value: params.fontSize ?? 24,
          onChange: (e: any) => onChange('fontSize', parseInt(e.target.value)),
          className: 'w-full accent-[var(--color-primary)]',
        }),
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
      createElement('div', { className: 'flex gap-2' },
        createElement('button', {
          onClick: () => onChange('fontWeight', 'normal'),
          className: `flex-1 rounded-lg border py-1 text-[10px] transition ${
            params.fontWeight === 'normal'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
          }`,
        }, '常规'),
        createElement('button', {
          onClick: () => onChange('fontWeight', 'bold'),
          className: `flex-1 rounded-lg border py-1 text-[10px] font-bold transition ${
            params.fontWeight === 'bold'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
          }`,
        }, '粗体'),
      ),
    );
  },

  applyCanvas(imageData, params) {
    const texts = params._texts;
    if (!texts || texts.length === 0) return imageData;

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    for (const t of texts) {
      ctx.font = `${t.fontWeight} ${t.fontSize}px sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textBaseline = 'top';
      ctx.fillText(t.text, t.x, t.y);
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  },
};

registerTool(tool);

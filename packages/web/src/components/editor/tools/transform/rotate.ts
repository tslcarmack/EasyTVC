import { RotateCw } from 'lucide-react';
import { registerTool, type EditorToolPlugin } from '../registry';
import { createElement } from 'react';

const rotateTool: EditorToolPlugin = {
  id: 'rotate',
  name: '旋转',
  icon: RotateCw,
  category: 'transform',
  shortcut: 'R',
  hint: '调整旋转角度，使用快捷按钮或滑块',

  defaultParams: { angle: 0 },

  renderParams(params, onChange) {
    const quickAngles = [
      { label: '90° ↻', value: 90 },
      { label: '90° ↺', value: -90 },
      { label: '180°', value: 180 },
    ];

    return createElement('div', { className: 'space-y-3' },
      createElement('div', { className: 'flex gap-1' },
        ...quickAngles.map((q) =>
          createElement('button', {
            key: q.value,
            onClick: () => onChange('angle', ((params.angle || 0) + q.value) % 360),
            className: 'flex-1 rounded-md border border-[var(--color-border)] py-1.5 text-[10px] text-[var(--color-text-secondary)] transition hover:bg-white/5 hover:text-white',
          }, q.label),
        ),
      ),
      createElement('div', { className: 'space-y-1' },
        createElement('label', { className: 'text-[10px] text-[var(--color-text-secondary)]' },
          `角度: ${params.angle || 0}°`,
        ),
        createElement('input', {
          type: 'range',
          min: -180,
          max: 180,
          value: params.angle || 0,
          onChange: (e: any) => onChange('angle', parseInt(e.target.value)),
          className: 'w-full accent-[var(--color-primary)]',
        }),
      ),
    );
  },

  applyCanvas(imageData, params) {
    const angle = (params.angle || 0) * Math.PI / 180;
    if (angle === 0) return imageData;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = imageData.width;
    srcCanvas.height = imageData.height;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.putImageData(imageData, 0, 0);

    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const newW = Math.ceil(imageData.width * cos + imageData.height * sin);
    const newH = Math.ceil(imageData.width * sin + imageData.height * cos);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = newW;
    outCanvas.height = newH;
    const outCtx = outCanvas.getContext('2d')!;

    outCtx.translate(newW / 2, newH / 2);
    outCtx.rotate(angle);
    outCtx.drawImage(srcCanvas, -imageData.width / 2, -imageData.height / 2);

    return outCtx.getImageData(0, 0, newW, newH);
  },
};

registerTool(rotateTool);

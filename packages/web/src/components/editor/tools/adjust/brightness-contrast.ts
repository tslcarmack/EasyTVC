import { Sun } from 'lucide-react';
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

const tool: EditorToolPlugin = {
  id: 'brightness-contrast',
  name: '亮度/对比度',
  icon: Sun,
  category: 'adjust',
  hint: '调整图片亮度和对比度',

  defaultParams: { brightness: 0, contrast: 0 },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      sliderRow('亮度', 'brightness', -100, 100, params, onChange),
      sliderRow('对比度', 'contrast', -100, 100, params, onChange),
    );
  },

  applyCanvas(imageData, params) {
    const { brightness = 0, contrast = 0 } = params;
    const data = new Uint8ClampedArray(imageData.data);

    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let v = data[i + c] + brightness * 2.55;
        v = factor * (v - 128) + 128;
        data[i + c] = Math.max(0, Math.min(255, v));
      }
    }

    return new ImageData(data, imageData.width, imageData.height);
  },
};

registerTool(tool);

import { Thermometer } from 'lucide-react';
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
  id: 'temperature-tint',
  name: '色温/色调',
  icon: Thermometer,
  category: 'adjust',
  hint: '调整色温（暖/冷）和色调（绿/品红）',

  defaultParams: { temperature: 0, tint: 0 },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      sliderRow('色温 (暖 ← → 冷)', 'temperature', -100, 100, params, onChange),
      sliderRow('色调 (绿 ← → 品红)', 'tint', -100, 100, params, onChange),
    );
  },

  applyCanvas(imageData, params) {
    const { temperature = 0, tint = 0 } = params;
    const data = new Uint8ClampedArray(imageData.data);

    const tempShift = temperature * 1.5;
    const tintShift = tint * 1.0;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + tempShift));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] - tintShift));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] - tempShift));
    }

    return new ImageData(data, imageData.width, imageData.height);
  },
};

registerTool(tool);

import { Lightbulb } from 'lucide-react';
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
  id: 'ai-relight',
  name: 'AI 打光',
  icon: Lightbulb,
  category: 'ai',
  hint: '调整光源参数，AI 重新为场景打光',

  defaultParams: {
    lightX: 50,
    lightY: 30,
    intensity: 100,
    colorTemp: 5500,
    direction: 'front',
  },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('p', { className: 'text-[10px] text-[var(--color-text-secondary)] leading-relaxed' },
        '设置光源位置和参数，AI 将重新计算场景光照。',
      ),
      createElement('div', { className: 'flex gap-1 flex-wrap' },
        ...['front', 'left', 'right', 'top', 'back'].map((d) =>
          createElement('button', {
            key: d,
            onClick: () => onChange('direction', d),
            className: `rounded px-2 py-0.5 text-[10px] transition ${
              params.direction === d
                ? 'bg-[var(--color-primary)]/20 text-white'
                : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
            }`,
          }, d === 'front' ? '正面' : d === 'left' ? '左侧' : d === 'right' ? '右侧' : d === 'top' ? '顶部' : '背面'),
        ),
      ),
      sliderRow('光源 X', 'lightX', 0, 100, params, onChange),
      sliderRow('光源 Y', 'lightY', 0, 100, params, onChange),
      sliderRow('强度', 'intensity', 0, 200, params, onChange),
      sliderRow('色温 (K)', 'colorTemp', 2000, 10000, params, onChange),
    );
  },

  buildAIRequest(context) {
    const { lightX, lightY, intensity, colorTemp, direction } = context.params;
    return {
      prompt: `Relight this scene with a ${direction} light source at position (${lightX}%, ${lightY}%), intensity ${intensity}%, color temperature ${colorTemp}K. ${context.params.prompt || ''}`.trim(),
      referenceImageUrls: [context.currentImageDataUrl],
      width: context.canvasWidth,
      height: context.canvasHeight,
    };
  },
};

registerTool(tool);

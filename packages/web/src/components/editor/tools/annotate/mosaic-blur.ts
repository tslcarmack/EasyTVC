import { Grid3X3 } from 'lucide-react';
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
  id: 'mosaic-blur',
  name: '马赛克/模糊笔',
  icon: Grid3X3,
  category: 'annotate',
  hint: '涂抹区域添加马赛克或模糊效果',

  defaultParams: {
    type: 'mosaic',
    size: 20,
    blockSize: 10,
    _regions: [] as Array<{ points: Array<{ x: number; y: number }>; type: string; size: number; blockSize: number }>,
  },

  renderParams(params, onChange) {
    return createElement('div', { className: 'space-y-3' },
      createElement('div', { className: 'flex gap-2' },
        createElement('button', {
          onClick: () => onChange('type', 'mosaic'),
          className: `flex-1 rounded-lg border py-1.5 text-[10px] transition ${
            params.type === 'mosaic'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
          }`,
        }, '马赛克'),
        createElement('button', {
          onClick: () => onChange('type', 'blur'),
          className: `flex-1 rounded-lg border py-1.5 text-[10px] transition ${
            params.type === 'blur'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
          }`,
        }, '模糊'),
      ),
      sliderRow('笔刷大小', 'size', 10, 50, params, onChange),
      params.type === 'mosaic' && sliderRow('块大小', 'blockSize', 5, 20, params, onChange),
    );
  },

  applyCanvas(imageData, params) {
    const regions = params._regions;
    if (!regions || regions.length === 0) return imageData;

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    for (const region of regions) {
      if (region.points.length === 0) continue;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = imageData.width;
      maskCanvas.height = imageData.height;
      const maskCtx = maskCanvas.getContext('2d')!;

      maskCtx.strokeStyle = 'white';
      maskCtx.lineWidth = region.size;
      maskCtx.lineCap = 'round';
      maskCtx.lineJoin = 'round';
      maskCtx.beginPath();
      maskCtx.moveTo(region.points[0].x, region.points[0].y);
      for (let i = 1; i < region.points.length; i++) {
        maskCtx.lineTo(region.points[i].x, region.points[i].y);
      }
      maskCtx.stroke();

      const maskData = maskCtx.getImageData(0, 0, imageData.width, imageData.height);

      if (region.type === 'mosaic') {
        const bs = region.blockSize || 10;
        const srcData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        for (let by = 0; by < imageData.height; by += bs) {
          for (let bx = 0; bx < imageData.width; bx += bs) {
            let hasHit = false;
            for (let dy = 0; dy < bs && by + dy < imageData.height; dy++) {
              for (let dx = 0; dx < bs && bx + dx < imageData.width; dx++) {
                const mi = ((by + dy) * imageData.width + (bx + dx)) * 4;
                if (maskData.data[mi] > 0 || maskData.data[mi + 1] > 0 || maskData.data[mi + 2] > 0) {
                  hasHit = true;
                  break;
                }
              }
              if (hasHit) break;
            }

            if (hasHit) {
              let rSum = 0, gSum = 0, bSum = 0, count = 0;
              for (let dy = 0; dy < bs && by + dy < imageData.height; dy++) {
                for (let dx = 0; dx < bs && bx + dx < imageData.width; dx++) {
                  const si = ((by + dy) * imageData.width + (bx + dx)) * 4;
                  rSum += srcData.data[si];
                  gSum += srcData.data[si + 1];
                  bSum += srcData.data[si + 2];
                  count++;
                }
              }
              const avgR = rSum / count;
              const avgG = gSum / count;
              const avgB = bSum / count;

              for (let dy = 0; dy < bs && by + dy < imageData.height; dy++) {
                for (let dx = 0; dx < bs && bx + dx < imageData.width; dx++) {
                  const si = ((by + dy) * imageData.width + (bx + dx)) * 4;
                  srcData.data[si] = avgR;
                  srcData.data[si + 1] = avgG;
                  srcData.data[si + 2] = avgB;
                }
              }
            }
          }
        }
        ctx.putImageData(srcData, 0, 0);
      }
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  },
};

registerTool(tool);

import { memo, useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Table, Plus, Minus } from 'lucide-react';
import { NodeWrapper } from './NodeWrapper';
import { useCanvasStore, type EasyTVCNodeData } from '../../stores/canvasStore';

export const TableNodeComponent = memo(function TableNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as EasyTVCNodeData;
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const headers = nodeData.headers || ['Column 1', 'Column 2'];
  const rows = nodeData.rows || [['', '']];

  const updateHeader = useCallback(
    (colIdx: number, value: string) => {
      const newHeaders = [...headers];
      newHeaders[colIdx] = value;
      updateNodeData(id, { headers: newHeaders });
    },
    [id, headers, updateNodeData],
  );

  const updateCell = useCallback(
    (rowIdx: number, colIdx: number, value: string) => {
      const newRows = rows.map((r) => [...r]);
      newRows[rowIdx][colIdx] = value;
      updateNodeData(id, { rows: newRows });
    },
    [id, rows, updateNodeData],
  );

  const addRow = useCallback(() => {
    const newRow = headers.map(() => '');
    updateNodeData(id, { rows: [...rows, newRow] });
  }, [id, headers, rows, updateNodeData]);

  const removeRow = useCallback(
    (rowIdx: number) => {
      if (rows.length <= 1) return;
      updateNodeData(id, { rows: rows.filter((_, i) => i !== rowIdx) });
    },
    [id, rows, updateNodeData],
  );

  const addColumn = useCallback(() => {
    const newHeaders = [...headers, `Column ${headers.length + 1}`];
    const newRows = rows.map((r) => [...r, '']);
    updateNodeData(id, { headers: newHeaders, rows: newRows });
  }, [id, headers, rows, updateNodeData]);

  const handleRename = useCallback(
    (newTitle: string) => {
      updateNodeData(id, { label: newTitle });
    },
    [id, updateNodeData],
  );

  return (
    <NodeWrapper nodeId={id} title={nodeData.label || 'Table'} icon={<Table size={14} />} color="#06b6d4" onRename={handleRename}>
      <div className="nodrag nowheel overflow-auto node-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {headers.map((h, ci) => (
                <th key={ci} className="border border-[var(--color-border)] p-0">
                  <input
                    value={h}
                    onChange={(e) => updateHeader(ci, e.target.value)}
                    className="w-full bg-[var(--color-bg)] px-2 py-1.5 text-center font-medium text-white outline-none"
                  />
                </th>
              ))}
              <th className="w-6 border border-[var(--color-border)] bg-[var(--color-bg)]">
                <button
                  onClick={addColumn}
                  className="flex w-full items-center justify-center py-1 text-[var(--color-text-secondary)] hover:text-white"
                >
                  <Plus size={12} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-[var(--color-border)] p-0">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="w-full bg-transparent px-2 py-1.5 text-[var(--color-text)] outline-none"
                      placeholder="..."
                    />
                  </td>
                ))}
                <td className="w-6 border border-[var(--color-border)]">
                  <button
                    onClick={() => removeRow(ri)}
                    className="flex w-full items-center justify-center py-1 text-[var(--color-text-secondary)] hover:text-red-400"
                  >
                    <Minus size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addRow}
          className="mt-1 flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-hover)] hover:text-white"
        >
          <Plus size={12} />
          Add Row
        </button>
      </div>
    </NodeWrapper>
  );
});

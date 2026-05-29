import type { CellAnchor, TableMatrix } from "../types";

export function buildTableMatrix(table: HTMLTableElement): TableMatrix {
  const matrix: Array<Array<HTMLTableCellElement | null>> = [];
  const anchors = new Map<HTMLTableCellElement, CellAnchor>();

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex];
    if (!matrix[rowIndex]) {
      matrix[rowIndex] = [];
    }

    let cursor = 0;
    for (const cell of Array.from(row.cells)) {
      while (matrix[rowIndex][cursor]) {
        cursor += 1;
      }

      const rowSpan = Math.max(1, cell.rowSpan || 1);
      const colSpan = Math.max(1, cell.colSpan || 1);

      if (!anchors.has(cell)) {
        anchors.set(cell, { row: rowIndex, col: cursor });
      }

      for (let rs = 0; rs < rowSpan; rs += 1) {
        if (!matrix[rowIndex + rs]) {
          matrix[rowIndex + rs] = [];
        }
        for (let cs = 0; cs < colSpan; cs += 1) {
          matrix[rowIndex + rs][cursor + cs] = cell;
        }
      }

      cursor += colSpan;
    }
  }

  return { matrix, anchors };
}

export function normalizeRectForSpans(
  tableData: TableMatrix,
  startMinRow: number,
  startMaxRow: number,
  startMinCol: number,
  startMaxCol: number,
): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
  let minRow = startMinRow;
  let maxRow = startMaxRow;
  let minCol = startMinCol;
  let maxCol = startMaxCol;

  let changed = true;
  while (changed) {
    changed = false;
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const cell = tableData.matrix[r]?.[c] ?? null;
        if (!cell) {
          continue;
        }
        const anchor = tableData.anchors.get(cell);
        if (!anchor) {
          continue;
        }

        const cellMinRow = anchor.row;
        const cellMinCol = anchor.col;
        const cellMaxRow = anchor.row + Math.max(1, cell.rowSpan || 1) - 1;
        const cellMaxCol = anchor.col + Math.max(1, cell.colSpan || 1) - 1;

        if (cellMinRow < minRow) {
          minRow = cellMinRow;
          changed = true;
        }
        if (cellMinCol < minCol) {
          minCol = cellMinCol;
          changed = true;
        }
        if (cellMaxRow > maxRow) {
          maxRow = cellMaxRow;
          changed = true;
        }
        if (cellMaxCol > maxCol) {
          maxCol = cellMaxCol;
          changed = true;
        }
      }
    }
  }

  return { minRow, maxRow, minCol, maxCol };
}

export function collectCellsInRect(
  tableData: TableMatrix,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number,
): HTMLTableCellElement[] {
  const unique = new Set<HTMLTableCellElement>();
  for (let r = minRow; r <= maxRow; r += 1) {
    for (let c = minCol; c <= maxCol; c += 1) {
      const cell = tableData.matrix[r]?.[c] ?? null;
      if (cell) {
        unique.add(cell);
      }
    }
  }
  return Array.from(unique);
}

export function getAdjacentCell(table: HTMLTableElement, cell: HTMLTableCellElement, arrowKey: string): HTMLTableCellElement | null {
  const tableData = buildTableMatrix(table);
  const anchor = tableData.anchors.get(cell);
  if (!anchor) {
    return null;
  }

  let row = anchor.row;
  let col = anchor.col;

  if (arrowKey === "ArrowLeft") {
    col = anchor.col - 1;
  } else if (arrowKey === "ArrowRight") {
    col = anchor.col + (cell.colSpan || 1);
  } else if (arrowKey === "ArrowUp") {
    row = anchor.row - 1;
  } else if (arrowKey === "ArrowDown") {
    row = anchor.row + (cell.rowSpan || 1);
  }

  if (row < 0 || col < 0) {
    return null;
  }

  return tableData.matrix[row]?.[col] ?? null;
}

export function getRowEdgeAnchoredCell(tableData: TableMatrix, row: number, edge: "start" | "end"): HTMLTableCellElement | null {
  let candidate: HTMLTableCellElement | null = null;
  let metric = edge === "start" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

  for (const [cell, pos] of tableData.anchors.entries()) {
    if (pos.row !== row) {
      continue;
    }

    if (edge === "start") {
      if (pos.col < metric) {
        metric = pos.col;
        candidate = cell;
      }
      continue;
    }

    const rightEdge = pos.col + Math.max(1, cell.colSpan || 1) - 1;
    if (rightEdge > metric) {
      metric = rightEdge;
      candidate = cell;
    }
  }

  return candidate;
}

export function getWrappedHorizontalCell(table: HTMLTableElement, cell: HTMLTableCellElement, arrowKey: "ArrowLeft" | "ArrowRight"): HTMLTableCellElement | null {
  const tableData = buildTableMatrix(table);
  const anchor = tableData.anchors.get(cell);
  if (!anchor) {
    return null;
  }

  if (arrowKey === "ArrowRight") {
    const startRow = anchor.row + Math.max(1, cell.rowSpan || 1);
    for (let row = startRow; row < table.rows.length; row += 1) {
      const first = getRowEdgeAnchoredCell(tableData, row, "start");
      if (first) {
        return first;
      }
    }
    return null;
  }

  for (let row = anchor.row - 1; row >= 0; row -= 1) {
    const last = getRowEdgeAnchoredCell(tableData, row, "end");
    if (last) {
      return last;
    }
  }
  return null;
}

export function getWrappedVerticalCell(table: HTMLTableElement, cell: HTMLTableCellElement, arrowKey: "ArrowUp" | "ArrowDown"): HTMLTableCellElement | null {
  const tableData = buildTableMatrix(table);
  const anchor = tableData.anchors.get(cell);
  if (!anchor) {
    return null;
  }

  const targetCol = anchor.col;
  if (arrowKey === "ArrowDown") {
    for (let row = 0; row < table.rows.length; row += 1) {
      const candidate = tableData.matrix[row]?.[targetCol] ?? null;
      if (candidate && candidate !== cell) {
        return candidate;
      }
    }
    return null;
  }

  for (let row = table.rows.length - 1; row >= 0; row -= 1) {
    const candidate = tableData.matrix[row]?.[targetCol] ?? null;
    if (candidate && candidate !== cell) {
      return candidate;
    }
  }
  return null;
}

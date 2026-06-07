import type { CellAnchor, TableMatrix } from "../types";

/**
 * HTML 테이블을 좌표 기반 TableMatrix로 변환한다.
 * Why: rowspan/colspan이 있는 표에서도 셀 탐색/선택/병합 계산을 일관되게 수행해야 한다.
 * How: 각 셀을 span 크기만큼 matrix에 채우고, 원본 셀의 시작 좌표를 anchors에 기록한다.
 * Pitfall: 이미 채워진 좌표를 건너뛰지 않으면 span이 겹쳐 잘못된 anchor가 생성된다.
 */
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
      // 이미 rowspan으로 채워진 좌표를 건너뛰고 실제 비어있는 컬럼 인덱스를 찾는다.
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
          // 동일 셀 참조를 span 영역 전체에 채워 넣는다.
          matrix[rowIndex + rs][cursor + cs] = cell;
        }
      }

      cursor += colSpan;
    }
  }

  return { matrix, anchors };
}

/**
 * 병합 셀(span) 경계를 포함하도록 선택 사각형을 정규화한다.
 * Why: 병합 영역 일부만 선택된 상태에서 merge/unmerge 계산 오차를 막아야 한다.
 * How: 현재 사각형 내부 셀의 실제 span 경계를 반복 스캔해 더 이상 확장되지 않을 때까지 갱신한다.
 * Pitfall: 1회 스캔만 하면 새로 확장된 경계에서 놓친 span이 남을 수 있다.
 */
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
    // 경계를 한 번 확장하면 새 경계에서 또 다른 span을 만날 수 있어,
    // 더 이상 확장되지 않을 때까지 반복 고정점 계산을 수행한다.
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

/**
 * 좌표 사각형 내부의 셀을 중복 없이 수집한다.
 * Why: span으로 동일 셀이 여러 좌표에 나타나므로 unique 수집이 필요하다.
 * How: matrix를 순회하며 Set에 넣은 뒤 배열로 반환한다.
 * Pitfall: 중복 제거 없이 사용하면 병합 시 같은 셀을 여러 번 처리해 오류가 난다.
 */
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

/**
 * 현재 셀 기준 방향키 인접 셀을 찾는다.
 * Why: span이 있는 표에서 단순 nextSibling으로는 올바른 이동이 불가능하다.
 * How: 현재 anchor와 span 크기를 사용해 목표 좌표(row,col)를 계산한 뒤 matrix에서 조회한다.
 * Pitfall: 경계 밖 좌표(음수 등)를 검사하지 않으면 런타임 오류가 발생할 수 있다.
 */
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
    // 오른쪽 이동은 현재 셀의 colSpan 끝 다음 칸으로 점프한다.
    col = anchor.col + (cell.colSpan || 1);
  } else if (arrowKey === "ArrowUp") {
    row = anchor.row - 1;
  } else if (arrowKey === "ArrowDown") {
    // 아래 이동은 현재 셀의 rowSpan 끝 다음 줄로 점프한다.
    row = anchor.row + (cell.rowSpan || 1);
  }

  if (row < 0 || col < 0) {
    return null;
  }

  return tableData.matrix[row]?.[col] ?? null;
}

/**
 * 특정 행의 시작/끝 anchor 셀을 반환한다.
 * Why: 좌우 래핑 이동 시 행 경계 셀을 빠르게 찾기 위해 필요하다.
 * How: anchors를 순회해 edge 기준 최소/최대 metric을 가진 셀을 선택한다.
 * Pitfall: end는 colSpan 오른쪽 끝을 기준으로 계산해야 정확하다.
 */
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

/**
 * 좌우 경계에서 행 단위 래핑 대상 셀을 찾는다.
 * Why: 표 편집기 UX처럼 행 끝에서 다음/이전 행으로 자연스럽게 이동해야 한다.
 * How: ArrowRight는 다음 행의 start, ArrowLeft는 이전 행의 end anchor를 탐색한다.
 * Pitfall: 현재 셀의 rowSpan을 고려하지 않으면 ArrowRight 래핑 시작 행이 어긋난다.
 */
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

/**
 * 상하 경계에서 같은 anchor 열 기준으로 반대 방향 래핑 대상을 찾는다.
 * Why: 세로 이동도 경계에서 끊기지 않고 순환 이동을 지원하기 위함이다.
 * How: targetCol(anchor.col)을 고정하고 위/아래 방향에 따라 행을 역/정순으로 순회한다.
 * Pitfall: 동일 셀을 그대로 반환하면 제자리 이동이 되어 루프처럼 보일 수 있어 제외한다.
 */
export function getWrappedVerticalCell(table: HTMLTableElement, cell: HTMLTableCellElement, arrowKey: "ArrowUp" | "ArrowDown"): HTMLTableCellElement | null {
  const tableData = buildTableMatrix(table);
  const anchor = tableData.anchors.get(cell);
  if (!anchor) {
    return null;
  }

  const targetCol = anchor.col;
  if (arrowKey === "ArrowDown") {
    // 아래 방향 wrap은 상단부터 같은 anchor col을 가진 셀을 찾는다.
    for (let row = 0; row < table.rows.length; row += 1) {
      const candidate = tableData.matrix[row]?.[targetCol] ?? null;
      if (candidate && candidate !== cell) {
        return candidate;
      }
    }
    return null;
  }

  // 위 방향 wrap은 하단부터 같은 anchor col을 가진 셀을 찾는다.
  for (let row = table.rows.length - 1; row >= 0; row -= 1) {
    const candidate = tableData.matrix[row]?.[targetCol] ?? null;
    if (candidate && candidate !== cell) {
      return candidate;
    }
  }
  return null;
}

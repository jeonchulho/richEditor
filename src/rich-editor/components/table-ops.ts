import type { CellAnchor, TableMatrix } from "../types";
import { buildTableMatrix } from "./table-helpers";

function pickClosestCellInRow(rowCells: Array<HTMLTableCellElement | null>, preferredCol: number): HTMLTableCellElement | null {
  if (rowCells.length === 0) {
    return null;
  }

  if (rowCells[preferredCol]) {
    return rowCells[preferredCol];
  }

  const maxDistance = Math.max(preferredCol, rowCells.length - 1 - preferredCol, rowCells.length);
  for (let distance = 1; distance <= maxDistance; distance += 1) {
    const left = preferredCol - distance;
    if (left >= 0 && rowCells[left]) {
      return rowCells[left];
    }

    const right = preferredCol + distance;
    if (right < rowCells.length && rowCells[right]) {
      return rowCells[right];
    }
  }

  return rowCells.find((current) => Boolean(current)) ?? null;
}

function findClosestCellInMatrix(tableData: TableMatrix, preferredRow: number, preferredCol: number): HTMLTableCellElement | null {
  if (tableData.matrix.length === 0) {
    return null;
  }

  const clampedRow = Math.max(0, Math.min(preferredRow, tableData.matrix.length - 1));
  const currentRowHit = pickClosestCellInRow(tableData.matrix[clampedRow] ?? [], preferredCol);
  if (currentRowHit) {
    return currentRowHit;
  }

  const maxDistance = tableData.matrix.length;
  for (let distance = 1; distance <= maxDistance; distance += 1) {
    const up = clampedRow - distance;
    if (up >= 0) {
      const upHit = pickClosestCellInRow(tableData.matrix[up] ?? [], preferredCol);
      if (upHit) {
        return upHit;
      }
    }

    const down = clampedRow + distance;
    if (down < tableData.matrix.length) {
      const downHit = pickClosestCellInRow(tableData.matrix[down] ?? [], preferredCol);
      if (downHit) {
        return downHit;
      }
    }
  }

  return null;
}

/**
 * 현재 셀 아래에 새 행을 추가한다.
 * Why: 표 편집 중 현재 문맥을 유지한 채 빠른 행 확장이 필요하다.
 * How: 기준 행의 cell 개수로 동일 폭 행을 생성해 afterend 삽입 후 리사이즈 핸들을 재구성한다.
 * Pitfall: 삽입 후 핸들을 재생성하지 않으면 새 행에서 리사이즈가 동작하지 않는다.
 */
export function addRow(ctx: any, side: "before" | "after" = "after"): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const row = cell.parentElement as HTMLTableRowElement;
  const table = row.closest("table") as HTMLTableElement | null;
  if (!table) {
    return;
  }

  const tableData = buildTableMatrix(table);
  const anchor = tableData.anchors.get(cell) as CellAnchor | undefined;
  if (!anchor) {
    ctx.debugLog?.(`table op addRow skip reason=missing-anchor side=${side}`);
    return;
  }

  // TinyMCE 유사 정책: 현재 셀 기준 위/아래에 행을 추가한다.
  const insertRowIndex = side === "before"
    ? anchor.row
    : anchor.row + Math.max(1, cell.rowSpan || 1);
  const totalCols = Math.max(
    0,
    ...tableData.matrix.map((rowData) => rowData.length),
  );

  const newRow = document.createElement("tr");
  const expandedRowSpanCells = new Set<HTMLTableCellElement>();
  let firstInsertedCell: HTMLTableCellElement | null = null;
  let insertedCount = 0;

  for (let col = 0; col < totalCols; col += 1) {
    const aboveCell = insertRowIndex > 0 ? (tableData.matrix[insertRowIndex - 1]?.[col] ?? null) as HTMLTableCellElement | null : null;
    const atBoundaryCell = (tableData.matrix[insertRowIndex]?.[col] ?? null) as HTMLTableCellElement | null;

    if (aboveCell && aboveCell === atBoundaryCell) {
      // 삽입 경계를 가로지르는 rowspan 셀은 span만 확장한다.
      if (!expandedRowSpanCells.has(aboveCell)) {
        aboveCell.rowSpan = Math.max(1, aboveCell.rowSpan || 1) + 1;
        expandedRowSpanCells.add(aboveCell);
      }
      continue;
    }

    const newCell = document.createElement("td");
    newCell.contentEditable = "true";
    newCell.style.minWidth = "80px";
    newCell.innerHTML = "<br>";
    ctx.applyBodyCellTypography(newCell);
    newRow.appendChild(newCell);
    insertedCount += 1;
    if (!firstInsertedCell) {
      firstInsertedCell = newCell;
    }
  }

  const refRow = table.rows[insertRowIndex] ?? null;
  if (refRow) {
    table.insertBefore(newRow, refRow);
  } else {
    table.appendChild(newRow);
  }

  if (firstInsertedCell) {
    ctx.placeCaretInCell(firstInsertedCell, "start");
  }

  ctx.debugLog?.(`table op addRow apply side=${side} insertRow=${insertRowIndex} inserted=${insertedCount} expanded=${expandedRowSpanCells.size}`);
  ctx.enableTableColumnResize(table);
  ctx.debouncedSave();
}

/**
 * 현재 셀 기준 오른쪽에 열을 추가한다.
 * Why: 셀 구조 확장 시 사용자가 보는 열 순서를 유지해야 한다.
 * How: 모든 행에 같은 인덱스로 셀을 삽입하고 첫 행은 헤더 스타일/텍스트를 적용한다.
 * Pitfall: 일부 행만 삽입하면 열 정렬이 깨져 matrix 탐색이 오작동한다.
 */
export function addCol(ctx: any, side: "before" | "after" = "after"): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const row = cell.parentElement as HTMLTableRowElement;
  const table = row.closest("table") as HTMLTableElement | null;
  if (!table) {
    return;
  }

  const tableData = buildTableMatrix(table);
  const anchor = tableData.anchors.get(cell) as CellAnchor | undefined;
  if (!anchor) {
    ctx.debugLog?.(`table op addCol skip reason=missing-anchor side=${side}`);
    return;
  }

  // TinyMCE 유사 정책: 현재 셀 기준 왼쪽/오른쪽에 열을 추가한다.
  const insertColIndex = side === "before"
    ? anchor.col
    : anchor.col + Math.max(1, cell.colSpan || 1);
  const expandedColSpanCells = new Set<HTMLTableCellElement>();
  let firstInsertedCell: HTMLTableCellElement | null = null;
  let insertedCount = 0;

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const tr = table.rows[rowIndex];
    const leftCell = insertColIndex > 0 ? (tableData.matrix[rowIndex]?.[insertColIndex - 1] ?? null) as HTMLTableCellElement | null : null;
    const rightCell = (tableData.matrix[rowIndex]?.[insertColIndex] ?? null) as HTMLTableCellElement | null;

    if (leftCell && leftCell === rightCell) {
      // 삽입 경계를 가로지르는 colspan 셀은 span만 확장한다.
      if (!expandedColSpanCells.has(leftCell)) {
        leftCell.colSpan = Math.max(1, leftCell.colSpan || 1) + 1;
        expandedColSpanCells.add(leftCell);
      }
      continue;
    }

    const isHeaderRow = rowIndex === 0;
    const newCell = document.createElement(isHeaderRow ? "th" : "td");
    newCell.contentEditable = "true";
    newCell.style.minWidth = "80px";

    if (isHeaderRow) {
      newCell.classList.add("re-table-header-cell");
      newCell.textContent = "Header";
    } else {
      ctx.applyBodyCellTypography(newCell as HTMLTableCellElement);
      newCell.innerHTML = "<br>";
    }

    const refCell = Array.from(tr.cells).find((current) => {
      const currentAnchor = tableData.anchors.get(current as HTMLTableCellElement) as CellAnchor | undefined;
      return Boolean(currentAnchor && currentAnchor.col >= insertColIndex);
    }) as HTMLTableCellElement | undefined;

    if (refCell) {
      tr.insertBefore(newCell, refCell);
    } else {
      tr.appendChild(newCell);
    }

    if (!firstInsertedCell) {
      firstInsertedCell = newCell as HTMLTableCellElement;
    }
    insertedCount += 1;
  }

  if (firstInsertedCell) {
    ctx.placeCaretInCell(firstInsertedCell, "start");
  }

  ctx.debugLog?.(`table op addCol apply side=${side} insertCol=${insertColIndex} inserted=${insertedCount} expanded=${expandedColSpanCells.size}`);
  ctx.enableTableColumnResize(table);
  ctx.debouncedSave();
}

/**
 * 현재 셀이 속한 행을 삭제한다.
 * Why: 삭제 후에도 편집 흐름이 끊기지 않도록 caret 복구가 필요하다.
 * How: 행 제거 후 인접 행/열 우선순위로 fallback 셀을 찾아 caret을 이동한다.
 * Pitfall: 마지막 행 삭제 시 테이블을 제거하지 않으면 빈 껍데기 DOM이 남는다.
 */
export function deleteRow(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const row = cell.parentElement as HTMLTableRowElement | null;
  const table = row?.closest("table") as HTMLTableElement | null;
  if (!row || !table) {
    return;
  }

  const tableData = buildTableMatrix(table);
  const anchor = tableData.anchors.get(cell) as CellAnchor | undefined;
  const targetRow = anchor?.row ?? row.rowIndex;
  const preferredCol = anchor?.col ?? 0;

  const expandedFromAbove = Array.from(tableData.anchors.entries())
    .filter(([currentCell, pos]) => {
      const span = Math.max(1, currentCell.rowSpan || 1);
      return pos.row < targetRow && targetRow <= pos.row + span - 1;
    })
    .map(([currentCell]) => currentCell);

  for (const currentCell of expandedFromAbove) {
    currentCell.rowSpan = Math.max(1, (currentCell.rowSpan || 1) - 1);
  }

  // 삭제 대상 행에서 시작한 rowspan 셀은 다음 행으로 이동해 구조를 유지한다.
  const movedDown = Array.from(tableData.anchors.entries())
    .filter(([currentCell, pos]) => pos.row === targetRow && Math.max(1, currentCell.rowSpan || 1) > 1)
    .sort(([, a], [, b]) => a.col - b.col);

  const nextRow = table.rows[targetRow + 1] as HTMLTableRowElement | undefined;
  for (const [movingCell, pos] of movedDown) {
    movingCell.rowSpan = Math.max(1, (movingCell.rowSpan || 1) - 1);
    if (!nextRow) {
      continue;
    }

    const refCell = Array.from(nextRow.cells).find((current) => {
      const currentPos = tableData.anchors.get(current as HTMLTableCellElement) as CellAnchor | undefined;
      return Boolean(currentPos && currentPos.col > pos.col);
    }) as HTMLTableCellElement | undefined;

    if (refCell) {
      nextRow.insertBefore(movingCell, refCell);
    } else {
      nextRow.appendChild(movingCell);
    }
  }

  row.remove();

  if (table.rows.length === 0) {
    // 마지막 행 삭제 시 테이블 자체를 제거하고 편집 지속용 문단을 남긴다.
    table.remove();
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    ctx.insertNodeAtCaret(p);
    ctx.debugLog?.(`table op deleteRow apply targetRow=${targetRow} result=table-removed expandedAbove=${expandedFromAbove.length} movedDown=${movedDown.length}`);
    ctx.debouncedSave();
    return;
  }

  ctx.enableTableColumnResize(table);
  const afterMatrix = buildTableMatrix(table);
  const fallbackCell = findClosestCellInMatrix(afterMatrix, Math.min(targetRow, afterMatrix.matrix.length - 1), preferredCol);
  if (fallbackCell) {
    ctx.placeCaretInCell(fallbackCell, "start");
  }

  ctx.debugLog?.(`table op deleteRow apply targetRow=${targetRow} expandedAbove=${expandedFromAbove.length} movedDown=${movedDown.length} fallback=${fallbackCell ? ctx.describeCell(fallbackCell) : "none"}`);
  ctx.debouncedSave();
}

/**
 * 현재 셀이 속한 열을 삭제한다.
 * Why: 행 삭제와 동일하게 삭제 후 편집 위치 복원이 필요하다.
 * How: 각 행의 동일 인덱스 셀을 제거하고, 가능한 가까운 셀을 찾아 caret을 이동한다.
 * Pitfall: 마지막 열 삭제 시 표 전체 제거를 처리하지 않으면 비정상 상태가 된다.
 */
export function deleteCol(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const row = cell.parentElement as HTMLTableRowElement | null;
  const table = row?.closest("table") as HTMLTableElement | null;
  if (!row || !table) {
    return;
  }

  const tableData = buildTableMatrix(table);
  const anchor = tableData.anchors.get(cell) as CellAnchor | undefined;
  if (!anchor) {
    return;
  }

  const targetRow = anchor.row;
  const targetCol = anchor.col;

  const toRemove: HTMLTableCellElement[] = [];
  for (const [currentCell, pos] of tableData.anchors.entries()) {
    const span = Math.max(1, currentCell.colSpan || 1);
    const endCol = pos.col + span - 1;
    if (targetCol < pos.col || targetCol > endCol) {
      continue;
    }

    if (span > 1) {
      currentCell.colSpan = span - 1;
      continue;
    }

    toRemove.push(currentCell);
  }

  for (const removable of toRemove) {
    removable.remove();
  }

  const hasAnyCell = Array.from(table.rows).some((currentRow) => currentRow.cells.length > 0);
  if (!hasAnyCell) {
    // 마지막 열 삭제 시 빈 테이블이 되므로 테이블 자체를 제거한다.
    table.remove();
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    ctx.insertNodeAtCaret(p);
    ctx.debugLog?.(`table op deleteCol apply targetCol=${targetCol} result=table-removed removed=${toRemove.length}`);
    ctx.debouncedSave();
    return;
  }

  ctx.enableTableColumnResize(table);
  const afterMatrix = buildTableMatrix(table);
  const fallbackCell = findClosestCellInMatrix(afterMatrix, targetRow, targetCol);
  if (fallbackCell) {
    ctx.placeCaretInCell(fallbackCell, "start");
  }

  const reducedSpanCount = Array.from(tableData.anchors.entries()).filter(([currentCell, pos]) => {
    const span = Math.max(1, currentCell.colSpan || 1);
    const endCol = pos.col + span - 1;
    return span > 1 && targetCol >= pos.col && targetCol <= endCol;
  }).length;
  ctx.debugLog?.(`table op deleteCol apply targetCol=${targetCol} reducedSpan=${reducedSpanCount} removed=${toRemove.length} fallback=${fallbackCell ? ctx.describeCell(fallbackCell) : "none"}`);
  ctx.debouncedSave();
}

/**
 * 현재 셀이 속한 테이블 전체를 삭제한다.
 * Why: 테이블 삭제 직후 caret 소실을 막아 연속 입력 UX를 유지해야 한다.
 * How: placeholder 문단을 먼저 삽입한 뒤 테이블 제거, selection을 placeholder로 복원한다.
 * Pitfall: placeholder 없이 삭제하면 selection이 body로 튀어 다음 입력 위치가 불안정해진다.
 */
export function deleteTable(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const table = cell.closest("table") as HTMLTableElement | null;
  if (!table) {
    return;
  }

  const placeholder = document.createElement("p");
  placeholder.innerHTML = "<br>";
  // 테이블 삭제 직후 caret 유실을 막기 위해 placeholder를 먼저 삽입한다.
  table.insertAdjacentElement("afterend", placeholder);

  ctx.clearSelectedCells();
  ctx.keyboardAnchorCell = null;
  ctx.keyboardFocusCell = null;
  table.remove();

  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(placeholder);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    ctx.captureSelection();
  }

  ctx.showSaveStatus("Table deleted");
  ctx.debugLog?.("table op deleteTable apply");
  ctx.debouncedSave();
}

/**
 * 병합 액션 진입점.
 * Why: 선택 개수에 따라 사용자 기대 동작(블록 병합 vs 오른쪽 병합)이 다르다.
 * How: selectedCells 크기로 분기해 mergeSelectedCellBlock 또는 mergeRightCell을 호출한다.
 * Pitfall: 분기 없이 단일 규칙만 적용하면 기존 사용 시나리오가 깨진다.
 */
export function mergeCells(ctx: any): void {
  ctx.debugLog?.(`table op mergeCells start selected=${ctx.selectedCells.size}`);
  if (ctx.selectedCells.size > 1) {
    // 다중 선택은 직사각형 블록 병합 규칙을 따른다.
    mergeSelectedCellBlock(ctx);
    return;
  }

  mergeRightCell(ctx);
}

/**
 * 현재 셀과 오른쪽 인접 셀을 단순 병합한다.
 * Why: 빠른 1차원 병합 UX를 지원하기 위한 경량 경로다.
 * How: colspan 합산 후 텍스트를 합치고 오른쪽 셀을 제거한다.
 * Pitfall: 텍스트 결합 시 공백/줄바꿈 처리 기준이 없으면 보기 품질이 떨어질 수 있다.
 */
function mergeRightCell(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const right = cell.nextElementSibling as HTMLTableCellElement | null;
  if (!right) {
    ctx.debugLog?.("table op mergeRight skip reason=no-right-cell");
    return;
  }

  const currentColspan = Number.parseInt(cell.getAttribute("colspan") ?? "1", 10);
  const rightColspan = Number.parseInt(right.getAttribute("colspan") ?? "1", 10);
  cell.colSpan = currentColspan + rightColspan;

  const isMeaningfulCellHtml = (html: string): boolean => {
    const normalized = html
      .replace(/<br\s*\/?>(\u00a0|\s)*/gi, "")
      .replace(/&nbsp;/gi, "")
      .trim();
    return normalized.length > 0;
  };

  const leftHtml = cell.innerHTML;
  const rightHtml = right.innerHTML;
  if (isMeaningfulCellHtml(leftHtml) && isMeaningfulCellHtml(rightHtml)) {
    cell.innerHTML = `${leftHtml}<br>${rightHtml}`;
  } else if (isMeaningfulCellHtml(rightHtml)) {
    cell.innerHTML = rightHtml;
  }
  right.remove();

  const table = cell.closest("table");
  if (table) {
    ctx.enableTableColumnResize(table as HTMLTableElement);
  }

  ctx.placeCaretInCell(cell, "start");
  ctx.debugLog?.(`table op mergeRight apply colSpan=${cell.colSpan}`);
  ctx.debouncedSave();
}

/**
 * 다중 선택된 블록을 하나의 master 셀로 병합한다.
 * Why: span이 섞인 표에서도 사용자가 의도한 직사각형 병합을 안전하게 수행해야 한다.
 * How: anchor 범위 정규화 -> 누락 preview 2단계 확정 -> master 설정 및 나머지 셀 제거 순으로 처리한다.
 * Pitfall: normalize 없이 병합하면 일부 셀이 누락되어 테이블 구조가 손상될 수 있다.
 */
function mergeSelectedCellBlock(ctx: any): void {
  const selected = Array.from(ctx.selectedCells) as HTMLTableCellElement[];
  if (selected.length < 2) {
    ctx.debugLog?.("table op mergeBlock skip reason=selection-too-small");
    return;
  }

  const table = selected[0].closest("table") as HTMLTableElement | null;
  if (!table) {
    ctx.clearSelectedCells();
    ctx.debugLog?.("table op mergeBlock skip reason=missing-table");
    return;
  }

  const tableData = ctx.buildTableMatrix(table);
  const anchors = selected.map((cell) => tableData.anchors.get(cell)).filter((item): item is CellAnchor => Boolean(item));
  if (anchors.length !== selected.length) {
    ctx.clearSelectedCells();
    ctx.debugLog?.("table op mergeBlock skip reason=anchor-mismatch");
    return;
  }

  const minRow = Math.min(...anchors.map((item) => item.row));
  const maxRow = Math.max(...anchors.map((item) => item.row));
  const minCol = Math.min(...anchors.map((item) => item.col));
  const maxCol = Math.max(...anchors.map((item) => item.col));

  const normalized = ctx.normalizeRectForSpans(tableData, minRow, maxRow, minCol, maxCol);

  const normalizedCells = ctx.collectCellsInRect(tableData, normalized.minRow, normalized.maxRow, normalized.minCol, normalized.maxCol) as HTMLTableCellElement[];
  const uncovered = normalizedCells.filter((cell) => !ctx.selectedCells.has(cell));

  if (uncovered.length > 0 && !ctx.pendingExpandedMerge) {
    // 1차 클릭: span으로 확장된 누락 영역을 preview로만 노출한다.
    ctx.setPendingExpandedMerge(true);
    ctx.updateMergePreview();
    ctx.showSaveStatus("Preview ready. Press Merge again to include expanded area.");
    ctx.debugLog?.(`table op mergeBlock preview uncovered=${uncovered.length}`);
    return;
  }

  if (uncovered.length > 0 && ctx.pendingExpandedMerge) {
    // 2차 클릭: preview 영역을 실제 선택에 포함해 병합을 확정한다.
    for (const cell of normalizedCells) {
      ctx.selectedCells.add(cell);
      cell.classList.add("re-cell-selected");
    }
    ctx.showSaveStatus("Merged with expanded area");
  }

  const blockCells: HTMLTableCellElement[] = [];

  for (let r = normalized.minRow; r <= normalized.maxRow; r += 1) {
    for (let c = normalized.minCol; c <= normalized.maxCol; c += 1) {
      const cell = tableData.matrix[r]?.[c] ?? null;
      if (!cell) {
        ctx.clearSelectedCells();
        ctx.showSaveStatus("Cannot merge: invalid table selection");
        return;
      }
      if (!blockCells.includes(cell)) {
        blockCells.push(cell);
      }
    }
  }

  const master = tableData.matrix[normalized.minRow]?.[normalized.minCol] ?? null;
  if (!master) {
    ctx.clearSelectedCells();
    ctx.showSaveStatus("Cannot merge: missing anchor cell");
    return;
  }
  const isMeaningfulCellHtml = (html: string): boolean => {
    const normalized = html
      .replace(/<br\s*\/?>(\u00a0|\s)*/gi, "")
      .replace(/&nbsp;/gi, "")
      .trim();
    return normalized.length > 0;
  };

  const mergedHtml = blockCells
    .map((currentCell) => currentCell.innerHTML)
    .map((html) => html.trim())
    .filter((html) => isMeaningfulCellHtml(html))
    // TinyMCE 유사 체감: 셀 콘텐츠를 보존하면서 줄 단위로 연결한다.
    .join("<br>");

  master.rowSpan = normalized.maxRow - normalized.minRow + 1;
  master.colSpan = normalized.maxCol - normalized.minCol + 1;
  if (mergedHtml) {
    master.innerHTML = mergedHtml;
  } else {
    master.innerHTML = "<br>";
  }

  const removable = blockCells.filter((currentCell) => currentCell !== master);
  for (const removableCell of removable) {
    removableCell.remove();
  }

  ctx.clearSelectedCells();
  ctx.enableTableColumnResize(table);
  ctx.placeCaretInCell(master, "start");
  ctx.debugLog?.(`table op mergeBlock apply rowSpan=${master.rowSpan} colSpan=${master.colSpan} mergedCells=${blockCells.length}`);
  ctx.debouncedSave();
}

/**
 * 병합 셀을 격자 셀로 분해(unmerge)한다.
 * Why: 병합 실수 복구와 콘텐츠 재배치 정책을 지원해야 한다.
 * How: anchor 기준으로 span 영역을 순회하며 셀을 재삽입하고, mode에 따라 텍스트를 분배한다.
 * Pitfall: ref 셀 삽입 위치 계산이 틀리면 열 순서가 깨져 이후 탐색 로직이 오작동한다.
 */
export function unmergeCell(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const rowSpan = cell.rowSpan || 1;
  const colSpan = cell.colSpan || 1;
  if (rowSpan === 1 && colSpan === 1) {
    ctx.debugLog?.("table op unmerge skip reason=not-merged");
    return;
  }

  const row = cell.parentElement as HTMLTableRowElement;
  const table = row.closest("table") as HTMLTableElement | null;
  if (!table) {
    ctx.debugLog?.("table op unmerge skip reason=missing-table");
    return;
  }

  const tableData = ctx.buildTableMatrix(table);
  const anchor = tableData.anchors.get(cell) as CellAnchor | undefined;
  if (!anchor) {
    ctx.debugLog?.("table op unmerge skip reason=missing-anchor");
    return;
  }

  const startRowIndex = anchor.row;
  const startColIndex = anchor.col;
  const isHeader = cell.tagName.toLowerCase() === "th";
  const sourceText = cell.textContent ?? "";
  const mode = ctx.getUnmergeContentMode();
  // 분리 대상 슬롯 목록(원본 셀 포함)을 모아 splitLines 분배 시 재사용한다.
  const targetSlots: HTMLTableCellElement[] = [cell];
  const currentStyle = window.getComputedStyle(ctx.getSelectionElement() ?? ctx.editor);

  if (mode === "clearAll") {
    cell.textContent = "";
  }

  cell.rowSpan = 1;
  cell.colSpan = 1;

  for (let r = startRowIndex; r < startRowIndex + rowSpan; r += 1) {
    const targetRow = table.rows[r];
    if (!targetRow) {
      continue;
    }

    for (let c = startColIndex; c < startColIndex + colSpan; c += 1) {
      if (r === startRowIndex && c === startColIndex) {
        continue;
      }

      const newCell = document.createElement(isHeader && r === 0 ? "th" : "td");
      newCell.contentEditable = "true";
      newCell.style.minWidth = "80px";
      if (newCell.tagName.toLowerCase() === "td") {
        ctx.applyBodyCellTypography(newCell as HTMLTableCellElement);
      } else {
        newCell.style.fontFamily = currentStyle.fontFamily;
        newCell.style.fontSize = currentStyle.fontSize;
      }

      if (mode === "duplicateAll") {
        newCell.textContent = sourceText;
      } else {
        // keepFirst/clearAll/splitLines는 기본적으로 새 셀을 비워 생성한다.
        newCell.innerHTML = "<br>";
      }

      const ref = Array.from(targetRow.cells).find((current) => {
        const position = tableData.anchors.get(current as HTMLTableCellElement) as CellAnchor | undefined;
        return Boolean(position && position.col > c);
      }) ?? null;

      if (ref) {
        targetRow.insertBefore(newCell, ref);
      } else {
        targetRow.appendChild(newCell);
      }

      targetSlots.push(newCell);
    }
  }

  if (mode === "splitLines") {
    distributeLinesAcrossCells(sourceText, targetSlots);
  }

  ctx.enableTableColumnResize(table);
  ctx.placeCaretInCell(cell, "start");
  ctx.debouncedSave();
  ctx.debugLog?.(`table op unmerge apply mode=${mode} slots=${targetSlots.length}`);
  ctx.showSaveStatus(`Unmerged (${mode})`);
}

/**
 * 멀티라인 텍스트를 셀 목록에 순서대로 분배한다.
 * Why: splitLines 모드에서 사용자 입력 줄 구조를 최대한 보존하기 위함이다.
 * How: 비어 있지 않은 라인만 추출해 인덱스 순서로 셀에 매핑한다.
 * Pitfall: 라인 수보다 셀 수가 많을 때 나머지 셀을 비우지 않으면 이전 값이 잔존할 수 있다.
 */
function distributeLinesAcrossCells(text: string, cells: HTMLTableCellElement[]): void {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    for (const cell of cells) {
      cell.textContent = "";
    }
    return;
  }

  for (let i = 0; i < cells.length; i += 1) {
    cells[i].textContent = lines[i] ?? "";
  }
}

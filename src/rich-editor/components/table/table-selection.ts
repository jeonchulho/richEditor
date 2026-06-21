/**
 * 단일 셀 선택을 토글한다.
 * Why: 다중 선택 UX에서 의도치 않은 테이블 간 선택 혼합을 방지해야 한다.
 * How: 기존 선택의 첫 셀과 현재 셀의 소속 테이블을 비교해 다르면 초기화 후 토글한다.
 * Pitfall: DOM 클래스와 selectedCells Set을 함께 갱신하지 않으면 시각/상태 불일치가 생긴다.
 */
export function toggleCellSelection(ctx: any, cell: HTMLTableCellElement): void {
  if (ctx.selectedCells.size > 0) {
    const first = Array.from(ctx.selectedCells)[0] as HTMLTableCellElement;
    const firstTable = first.closest("table");
    const currentTable = cell.closest("table");
    if (firstTable !== currentTable) {
      ctx.clearSelectedCells();
    }
  }

  if (ctx.selectedCells.has(cell)) {
    // 이미 선택된 셀을 다시 클릭하면 토글 해제한다.
    ctx.selectedCells.delete(cell);
    cell.classList.remove("re-cell-selected");
    return;
  }

  ctx.selectedCells.add(cell);
  cell.classList.add("re-cell-selected");
  // 선택 집합이 바뀌면 병합 preview 상태를 다시 계산해야 한다.
  ctx.setPendingExpandedMerge(false);
  ctx.updateMergePreview();
}

/**
 * 시작 셀과 끝 셀을 감싸는 직사각형 선택 영역을 계산한다.
 * Why: Shift 확장/드래그 선택에서 예측 가능한 범위 선택이 필요하다.
 * How: anchor 좌표(min/max row,col)로 사각형을 만든 뒤 해당 좌표의 셀에 선택 클래스를 적용한다.
 * Pitfall: 테이블이 다르거나 anchor를 얻지 못하면 조용히 중단해 상태 오염을 막아야 한다.
 */
export function selectCellRectangle(ctx: any, startCell: HTMLTableCellElement, endCell: HTMLTableCellElement): void {
  const startTable = startCell.closest("table") as HTMLTableElement | null;
  const endTable = endCell.closest("table") as HTMLTableElement | null;
  if (!startTable || startTable !== endTable) {
    return;
  }

  const tableData = ctx.buildTableMatrix(startTable);
  const startAnchor = tableData.anchors.get(startCell);
  const endAnchor = tableData.anchors.get(endCell);
  if (!startAnchor || !endAnchor) {
    return;
  }

  const minRow = Math.min(startAnchor.row, endAnchor.row);
  const maxRow = Math.max(startAnchor.row, endAnchor.row);
  const minCol = Math.min(startAnchor.col, endAnchor.col);
  const maxCol = Math.max(startAnchor.col, endAnchor.col);

  // 드래그/Shift 확장 시 매번 새 직사각형으로 재계산한다.
  ctx.clearSelectedCells();

  for (let rowIdx = minRow; rowIdx <= maxRow; rowIdx += 1) {
    for (let colIdx = minCol; colIdx <= maxCol; colIdx += 1) {
      const cell = tableData.matrix[rowIdx]?.[colIdx] ?? null;
      if (!cell) {
        continue;
      }
      ctx.selectedCells.add(cell);
      cell.classList.add("re-cell-selected");
    }
  }

  ctx.setPendingExpandedMerge(false);
  ctx.updateMergePreview();
}

/**
 * 셀 선택 상태를 완전히 초기화한다.
 * Why: 선택 변경 시 이전 선택/미리보기 잔상을 제거해야 merge 판단이 정확하다.
 * How: DOM 클래스 제거 -> selectedCells 비우기 -> pending/preview 상태 정리 순서로 처리한다.
 * Pitfall: preview만 비우고 selectedCells를 유지하면 키보드/병합 동작이 꼬일 수 있다.
 */
export function clearSelectedCells(ctx: any): void {
  // DOM class와 내부 Set을 함께 비워야 시각/상태 불일치가 생기지 않는다.
  for (const selected of ctx.selectedCells as Set<HTMLTableCellElement>) {
    selected.classList.remove("re-cell-selected");
  }
  ctx.selectedCells.clear();
  ctx.setPendingExpandedMerge(false);
  ctx.clearMergePreview();
}

/**
 * Shift + 방향키로 테이블 내부 셀 직사각형 선택을 확장한다.
 * Why: 표 내부에서는 셀 단위 확장 선택 UX를 제공하고,
 *      경계/표 밖에서는 브라우저 기본 동작으로 자연스럽게 넘긴다.
 */
export function handleTableSelectionKeydown(ctx: any, event: KeyboardEvent): boolean {
  if (!event.shiftKey) {
    return false;
  }

  const key = event.key;
  if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "ArrowLeft" && key !== "ArrowRight") {
    return false;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const activeRange = selection.getRangeAt(0);
  const startElement = activeRange.startContainer instanceof HTMLElement
    ? activeRange.startContainer
    : activeRange.startContainer.parentElement;
  const endElement = activeRange.endContainer instanceof HTMLElement
    ? activeRange.endContainer
    : activeRange.endContainer.parentElement;

  const startTable = startElement?.closest("table") as HTMLTableElement | null;
  const endTable = endElement?.closest("table") as HTMLTableElement | null;
  if (!startTable || !endTable || startTable !== endTable) {
    ctx.debugLog(`table selection native-pass key=${key} reason=range-outside-or-cross-table`);
    return false;
  }

  const rangeTable = startTable;
  if (!rangeTable) {
    return false;
  }

  const fallbackCandidates = [
    ctx.getSelectedCell() as HTMLTableCellElement | null,
    ctx.keyboardFocusCell as HTMLTableCellElement | null,
    ctx.keyboardAnchorCell as HTMLTableCellElement | null,
    ctx.lastTableAnchorCell as HTMLTableCellElement | null,
  ];

  const base = fallbackCandidates.find((candidate) => {
    if (!candidate || !candidate.isConnected) {
      return false;
    }
    return candidate.closest("table") === rangeTable;
  }) ?? null;

  if (!base) {
    ctx.debugLog(`table selection native-pass key=${key} reason=no-base-cell`);
    return false;
  }

  const currentFocus = (ctx.keyboardFocusCell as HTMLTableCellElement | null);
  const focus = (currentFocus && currentFocus.isConnected && currentFocus.closest("table") === rangeTable)
    ? currentFocus
    : base;

  let anchor = ctx.keyboardAnchorCell as HTMLTableCellElement | null;
  if (!anchor || !anchor.isConnected || anchor.closest("table") !== rangeTable) {
    anchor = base;
  }

  if (!selection.isCollapsed) {
    // 셀 선택 모드에서 브라우저 native 텍스트 확장 range가 새면,
    // 다음 Shift+Arrow가 계속 native-pass로 흘러 선택이 꼬일 수 있다.
    // 관리 중인 focus 셀로 캐럿을 복구해 셀 단위 selection 흐름을 유지한다.
    event.preventDefault();
    ctx.keyboardAnchorCell = anchor;
    ctx.keyboardFocusCell = focus;
    ctx.lastTableAnchorCell = focus;
    ctx.placeCaretInCell(focus, "start");
    ctx.debugLog(`table selection recover-collapsed key=${key} focus=${ctx.describeCell(focus)} reason=selection-not-collapsed continue=true`);
  }

  const next = ctx.getAdjacentCell(focus, key) as HTMLTableCellElement | null;
  if (!next) {
    // 경계에서 native로 넘기면 텍스트 range가 확장되어 셀 선택 상태가 깨질 수 있다.
    // 셀 단위 selection 모드에서는 경계에서 키를 소비해 edge-lock 한다.
    event.preventDefault();
    ctx.debugLog(`table selection edge-lock key=${key} base=${ctx.describeCell(focus)} reason=no-adjacent`);
    return true;
  }

  event.preventDefault();
  ctx.keyboardAnchorCell = anchor;
  ctx.keyboardFocusCell = next;
  ctx.lastTableAnchorCell = next;
  ctx.selectCellRectangle(anchor, next);
  ctx.setActiveTableElement(rangeTable);
  ctx.placeCaretInCell(next);
  ctx.debugLog(`table selection inside-move key=${key} anchor=${ctx.describeCell(anchor)} focus=${ctx.describeCell(next)} selected=${ctx.selectedCells.size}`);
  return true;
}
